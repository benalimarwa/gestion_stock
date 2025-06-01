from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error
import requests
import joblib
import os
from typing import List

app = FastAPI(
    title="Supplier Score API",
    description="API for training and predicting supplier scores based on order data.",
    version="1.0.0",
)

class CommandeData(BaseModel):
    fournisseurId: str
    delay_days: float
    has_return: int
    total_quantity: int
    is_canceled: int
    order_count: int

class FournisseurScore(BaseModel):
    fournisseurId: str
    score: float

MODEL_PATH = "supplier_score_model.pkl"

@app.post("/train-and-score", response_model=List[FournisseurScore], summary="Train the model and predict scores")
async def train_and_score():
    """
    Trains a Linear Regression model using supplier order data and predicts scores.
    Fetches data from the Next.js API at /api/data-for-model.
    Returns a list of supplier scores.
    """
    # Récupérer les données depuis l'API Next.js
    try:
        response = requests.get("http://localhost:3000/api/data-for-model")
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"Erreur lors de la récupération des données: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des données de l'API Next.js")

    # Préparer les données
    df = pd.DataFrame(data)
    if df.empty:
        raise HTTPException(status_code=400, detail="Aucune donnée disponible pour l'entraînement")

    # Nettoyer les données
    df["delay_days"] = df["delay_days"].replace([np.inf, -np.inf], np.nan).fillna(0)
    if "is_late" not in df.columns:
        df["is_late"] = (df["delay_days"] > 0).astype(int)  # Ajouter is_late s'il n'existe pas
    df["has_return"] = df["has_return"].astype(int)
    df["total_quantity"] = df["total_quantity"].astype(int)
    df["is_canceled"] = df["is_canceled"].astype(int)

    # Vérifier que toutes les colonnes nécessaires sont présentes
    required_columns = ["fournisseurId", "delay_days", "has_return", "total_quantity", "is_canceled"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes dans les données: {missing_columns}")

    # Calculer les caractéristiques agrégées par fournisseur
    grouped = df.groupby("fournisseurId").agg({
        "delay_days": "mean",
        "is_late": "mean",
        "has_return": "mean",
        "total_quantity": "sum",
        "is_canceled": "mean",
        "fournisseurId": "count",
    }).reset_index()

    # Renommer les colonnes pour plus de clarté
    grouped.columns = [
        "fournisseurId",
        "avg_delay_days",
        "avg_is_late",
        "avg_has_return",
        "total_quantity",
        "avg_is_canceled",
        "order_count",
    ]

    # Calculer un score de base heuristique pour l'entraînement
    grouped["score"] = 100 - (
        grouped["avg_delay_days"] * 5 +  # Pénalité pour les retards
        grouped["avg_is_late"] * 30 +    # Pénalité pour la proportion de commandes en retard
        grouped["avg_has_return"] * 20 + # Pénalité pour les retours
        grouped["avg_is_canceled"] * 15  # Pénalité pour les annulations
    )
    grouped["score"] = grouped["score"].clip(0, 100)

    # Entraîner un modèle simple
    X = grouped[["avg_delay_days", "avg_is_late", "avg_has_return", "total_quantity", "avg_is_canceled", "order_count"]]
    y = grouped["score"]
    try:
        model = LinearRegression()
        model.fit(X, y)

        # Évaluer le modèle
        y_pred = model.predict(X)
        r2 = r2_score(y, y_pred)
        mse = mean_squared_error(y, y_pred)
        print(f"Évaluation du modèle - R²: {r2:.4f}, MSE: {mse:.4f}")

        # Sauvegarder le modèle
        joblib.dump(model, MODEL_PATH)
        print(f"Modèle entraîné et sauvegardé sous '{MODEL_PATH}'")
    except Exception as e:
        print(f"Erreur lors de l'entraînement du modèle: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'entraînement du modèle: {str(e)}")

    # Prédire les scores
    scores = model.predict(X).clip(0, 100)

    # Retourner les scores
    result = [
        FournisseurScore(fournisseurId=row["fournisseurId"], score=float(score))
        for row, score in zip(grouped.to_dict("records"), scores)
    ]
    return result

@app.post("/predict-score", response_model=List[FournisseurScore], summary="Predict scores using the trained model")
async def predict_score():
    """
    Predicts supplier scores using a pre-trained model without retraining.
    Fetches data from the Next.js API at /api/data-for-model.
    Returns a list of supplier scores.
    """
    # Vérifier si le modèle existe, sinon l'entraîner
    if not os.path.exists(MODEL_PATH):
        print(f"Modèle non trouvé à {MODEL_PATH}. Entraînement du modèle...")
        return await train_and_score()

    # Charger le modèle entraîné
    try:
        model = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"Erreur lors du chargement du modèle: {e}")
        print("Tentative de réentraînement du modèle...")
        return await train_and_score()

    # Récupérer les données depuis l'API Next.js
    try:
        response = requests.get("http://localhost:3000/api/data-for-model")
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"Erreur lors de la récupération des données: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des données de l'API Next.js")

    # Préparer les données
    df = pd.DataFrame(data)
    if df.empty:
        raise HTTPException(status_code=400, detail="Aucune donnée disponible pour la prédiction")

    # Nettoyer les données
    df["delay_days"] = df["delay_days"].replace([np.inf, -np.inf], np.nan).fillna(0)
    if "is_late" not in df.columns:
        df["is_late"] = (df["delay_days"] > 0).astype(int)  # Ajouter is_late s'il n'existe pas
    df["has_return"] = df["has_return"].astype(int)
    df["total_quantity"] = df["total_quantity"].astype(int)
    df["is_canceled"] = df["is_canceled"].astype(int)

    # Vérifier que toutes les colonnes nécessaires sont présentes
    required_columns = ["fournisseurId", "delay_days", "has_return", "total_quantity", "is_canceled"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes dans les données: {missing_columns}")

    # Calculer les caractéristiques agrégées par fournisseur
    grouped = df.groupby("fournisseurId").agg({
        "delay_days": "mean",
        "is_late": "mean",
        "has_return": "mean",
        "total_quantity": "sum",
        "is_canceled": "mean",
        "fournisseurId": "count",
    }).reset_index()

    # Renommer les colonnes
    grouped.columns = [
        "fournisseurId",
        "avg_delay_days",
        "avg_is_late",
        "avg_has_return",
        "total_quantity",
        "avg_is_canceled",
        "order_count",
    ]

    # Prédire les scores
    X = grouped[["avg_delay_days", "avg_is_late", "avg_has_return", "total_quantity", "avg_is_canceled", "order_count"]]
    scores = model.predict(X).clip(0, 100)

    # Retourner les scores
    result = [
        FournisseurScore(fournisseurId=row["fournisseurId"], score=float(score))
        for row, score in zip(grouped.to_dict("records"), scores)
    ]
    return result