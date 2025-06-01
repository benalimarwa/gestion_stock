import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fetchScoresFromAIModel(): Promise<{ fournisseurId: string; score: number }[]> {
  try {
    // First check if the model needs to be trained
    let response = await fetch("http://localhost:8000/predict-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    // If successful, return the scores
    if (response.ok) {
      const result = await response.json();
      console.log("Scores fetched from AI model:", result);
      
      return result.map((item: { fournisseurId: string; score: number }) => ({
        fournisseurId: item.fournisseurId,
        score: Math.round(item.score * 100) / 100, // Round to 2 decimal places
      }));
    } else {
      console.error(`Error from predict-score endpoint: ${response.statusText}`);
      console.log("Attempting to train the model first...");
      
      // If prediction failed, try training the model
      const trainResponse = await fetch("http://localhost:8000/train-and-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!trainResponse.ok) {
        throw new Error(`Failed to train model: ${trainResponse.statusText}`);
      }
      
      const trainResult = await trainResponse.json();
      console.log("Model trained and scores generated:", trainResult);
      
      return trainResult.map((item: { fournisseurId: string; score: number }) => ({
        fournisseurId: item.fournisseurId,
        score: Math.round(item.score * 100) / 100, // Round to 2 decimal places
      }));
    }
  } catch (error) {
    console.error("Error fetching scores from AI model:", error);
    throw error;
  }
}

export async function GET() {
  try {
    console.log("Starting score update process...");

    // Fetch scores from the AI model
    const scores = await fetchScoresFromAIModel();

    // Update scores in the database
    const updateResults = [];
    for (const { fournisseurId, score } of scores) {
      const result = await prisma.fournisseur.update({
        where: { id: fournisseurId },
        data: { score },
      });
      updateResults.push({ id: fournisseurId, score });
      console.log(`Updated score for fournisseur ${fournisseurId}: ${score}`);
    }

    return NextResponse.json({ 
      message: "Scores updated successfully", 
      updatedScores: updateResults 
    });
  } catch (error) {
    console.error("Error updating scores:", error);
    return NextResponse.json({ error: "Failed to update scores" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}