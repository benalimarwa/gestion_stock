"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var users, demandeur1, demandeur2, adminAchat, gestionnaire, categories, produits, fournisseurs, commandes, demandes, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 14, 15, 17]);
                    console.log("Début du seeding...");
                    return [4 /*yield*/, Promise.all([
                            prisma.user.create({
                                data: {
                                    email: "admin@example.com",
                                    name: "Admin User",
                                    role: "ADMIN",
                                    clerkUserId: "clerk_admin_001",
                                    createdAt: new Date("2024-01-01"),
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: "demandeur1@example.com",
                                    name: "Demandeur Employé",
                                    role: "DEMANDEUR",
                                    clerkUserId: "clerk_demandeur_001",
                                    createdAt: new Date("2024-02-01"),
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: "demandeur2@example.com",
                                    name: "Demandeur Enseignant",
                                    role: "DEMANDEUR",
                                    clerkUserId: "clerk_demandeur_002",
                                    createdAt: new Date("2024-03-01"),
                                },
                            }),
                            prisma.user.create({
                                data: {
                                    email: "magasinier@example.com",
                                    name: "Magasinier",
                                    role: "MAGASINNAIRE",
                                    clerkUserId: "clerk_magasinier_001",
                                    createdAt: new Date("2024-04-01"),
                                },
                            }),
                        ])];
                case 1:
                    users = _a.sent();
                    return [4 /*yield*/, prisma.demandeur.create({
                            data: {
                                userId: users[1].id,
                                type: "EMPLOYE",
                                createdAt: new Date("2024-02-02"),
                            },
                        })];
                case 2:
                    demandeur1 = _a.sent();
                    return [4 /*yield*/, prisma.demandeur.create({
                            data: {
                                userId: users[2].id,
                                type: "ENSEIGNANT",
                                createdAt: new Date("2024-03-02"),
                            },
                        })];
                case 3:
                    demandeur2 = _a.sent();
                    return [4 /*yield*/, prisma.adminAchat.create({
                            data: {
                                userId: users[0].id,
                                createdAt: new Date("2024-01-02"),
                            },
                        })];
                case 4:
                    adminAchat = _a.sent();
                    return [4 /*yield*/, prisma.gestionnaire.create({
                            data: {
                                userId: users[3].id,
                                createdAt: new Date("2024-04-02"),
                            },
                        })];
                case 5:
                    gestionnaire = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.categorie.create({ data: { nom: "Projectors", description: "Projecteurs pour salles de classe" } }),
                            prisma.categorie.create({ data: { nom: "Laptops", description: "Ordinateurs portables pour enseignants" } }),
                            prisma.categorie.create({ data: { nom: "Desktops", description: "Ordinateurs fixes pour bureaux" } }),
                            prisma.categorie.create({ data: { nom: "Printers", description: "Imprimantes pour usage général" } }),
                            prisma.categorie.create({ data: { nom: "Whiteboards", description: "Tableaux blancs interactifs" } }),
                        ])];
                case 6:
                    categories = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.produit.create({
                                data: {
                                    nom: "Projector Epson",
                                    marque: "Epson",
                                    quantite: 15,
                                    quantiteMinimale: 5,
                                    categorieId: categories[0].id,
                                    remarque: "Utilisé dans les amphis",
                                    statut: "NORMALE",
                                    createdAt: new Date("2024-01-15"),
                                },
                            }),
                            prisma.produit.create({
                                data: {
                                    nom: "Laptop Dell",
                                    marque: "Dell",
                                    quantite: 20,
                                    quantiteMinimale: 10,
                                    categorieId: categories[1].id,
                                    statut: "CRITIQUE",
                                    createdAt: new Date("2024-02-15"),
                                },
                            }),
                            prisma.produit.create({
                                data: {
                                    nom: "Desktop HP",
                                    marque: "HP",
                                    quantite: 10,
                                    quantiteMinimale: 5,
                                    categorieId: categories[2].id,
                                    statut: "NORMALE",
                                    createdAt: new Date("2024-03-15"),
                                },
                            }),
                            prisma.produit.create({
                                data: {
                                    nom: "Printer Canon",
                                    marque: "Canon",
                                    quantite: 5,
                                    quantiteMinimale: 3,
                                    categorieId: categories[3].id,
                                    statut: "RUPTURE",
                                    createdAt: new Date("2024-04-15"),
                                },
                            }),
                            prisma.produit.create({
                                data: {
                                    nom: "Whiteboard Smart",
                                    marque: "Smart",
                                    quantite: 8,
                                    quantiteMinimale: 2,
                                    categorieId: categories[4].id,
                                    statut: "NORMALE",
                                    createdAt: new Date("2024-05-15"),
                                },
                            }),
                        ])];
                case 7:
                    produits = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.fournisseur.create({ data: { nom: "TechSupplier", contact: "contact@techsupplier.com", createdAt: new Date("2024-01-10") } }),
                            prisma.fournisseur.create({ data: { nom: "EduEquip", contact: "contact@eduequip.com", createdAt: new Date("2024-02-10") } }),
                            prisma.fournisseur.create({ data: { nom: "OfficeGear", contact: "contact@officegear.com", createdAt: new Date("2024-03-10") } }),
                        ])];
                case 8:
                    fournisseurs = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.commande.create({
                                data: {
                                    fournisseurId: fournisseurs[0].id,
                                    statut: "LIVREE",
                                    date: new Date("2024-06-01"),
                                    dateLivraison: new Date("2024-06-10"),
                                    produits: {
                                        create: [
                                            { produitId: produits[0].id, quantite: 5 },
                                            { produitId: produits[1].id, quantite: 3 },
                                        ],
                                    },
                                    createdAt: new Date("2024-06-01"),
                                },
                            }),
                            prisma.commande.create({
                                data: {
                                    fournisseurId: fournisseurs[1].id,
                                    statut: "EN_COURS",
                                    date: new Date("2024-07-01"),
                                    produits: {
                                        create: [
                                            { produitId: produits[2].id, quantite: 2 },
                                            { produitId: produits[3].id, quantite: 4 },
                                        ],
                                    },
                                    createdAt: new Date("2024-07-01"),
                                },
                            }),
                            prisma.commande.create({
                                data: {
                                    fournisseurId: fournisseurs[2].id,
                                    statut: "ANNULEE",
                                    date: new Date("2024-08-01"),
                                    raisonRetour: "Commande annulée pour cause de budget",
                                    produits: {
                                        create: [
                                            { produitId: produits[4].id, quantite: 3 },
                                        ],
                                    },
                                    createdAt: new Date("2024-08-01"),
                                },
                            }),
                        ])];
                case 9:
                    commandes = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.demande.create({
                                data: {
                                    demandeurId: demandeur1.id,
                                    statut: "APPROUVEE",
                                    dateApprouvee: new Date("2024-06-15"),
                                    produits: {
                                        create: [
                                            { produitId: produits[0].id, quantite: 2 },
                                            { produitId: produits[1].id, quantite: 1 },
                                        ],
                                    },
                                    createdAt: new Date("2024-06-10"),
                                },
                            }),
                            prisma.demande.create({
                                data: {
                                    demandeurId: demandeur2.id,
                                    statut: "EN_ATTENTE",
                                    produits: {
                                        create: [
                                            { produitId: produits[2].id, quantite: 3 },
                                            { produitId: produits[3].id, quantite: 2 },
                                        ],
                                    },
                                    createdAt: new Date("2024-07-10"),
                                },
                            }),
                            prisma.demande.create({
                                data: {
                                    demandeurId: demandeur1.id,
                                    statut: "REJETEE",
                                    raisonRefus: "Manque de budget",
                                    produits: {
                                        create: [
                                            { produitId: produits[4].id, quantite: 1 },
                                        ],
                                    },
                                    createdAt: new Date("2024-08-10"),
                                },
                            }),
                        ])];
                case 10:
                    demandes = _a.sent();
                    // 8. Créer des alertes (pour les produits en rupture ou critiques)
                    return [4 /*yield*/, Promise.all([
                            prisma.alerte.create({
                                data: {
                                    produitId: produits[1].id, // Laptop Dell (CRITIQUE)
                                    typeAlerte: "CRITIQUE",
                                    date: new Date("2024-07-20"),
                                    description: "Stock critique pour les laptops Dell",
                                    createdAt: new Date("2024-07-20"),
                                },
                            }),
                            prisma.alerte.create({
                                data: {
                                    produitId: produits[3].id, // Printer Canon (RUPTURE)
                                    typeAlerte: "RUPTURE",
                                    date: new Date("2024-08-20"),
                                    description: "Stock en rupture pour les imprimantes Canon",
                                    createdAt: new Date("2024-08-20"),
                                },
                            }),
                        ])];
                case 11:
                    // 8. Créer des alertes (pour les produits en rupture ou critiques)
                    _a.sent();
                    // 9. Créer des notifications
                    return [4 /*yield*/, Promise.all([
                            prisma.notification.create({
                                data: {
                                    userId: users[0].id, // Admin
                                    message: "Nouvelle commande livrée (ID: " + commandes[0].id + ")",
                                    dateEnvoi: new Date("2024-06-10"),
                                    typeEnvoi: "EMAIL",
                                    createdAt: new Date("2024-06-10"),
                                },
                            }),
                            prisma.notification.create({
                                data: {
                                    userId: users[1].id, // Demandeur 1
                                    message: "Votre demande a été approuvée (ID: " + demandes[0].id + ")",
                                    dateEnvoi: new Date("2024-06-15"),
                                    typeEnvoi: "EMAIL",
                                    createdAt: new Date("2024-06-15"),
                                },
                            }),
                            prisma.notification.create({
                                data: {
                                    userId: users[3].id, // Magasinier
                                    message: "Alerte : Stock critique pour les laptops Dell",
                                    dateEnvoi: new Date("2024-07-20"),
                                    typeEnvoi: "EMAIL",
                                    createdAt: new Date("2024-07-20"),
                                },
                            }),
                        ])];
                case 12:
                    // 9. Créer des notifications
                    _a.sent();
                    // 10. Créer des rapports (Reporting)
                    return [4 /*yield*/, Promise.all([
                            prisma.reporting.create({
                                data: {
                                    type: "Stock Mensuel",
                                    date: new Date("2024-06-30"),
                                    createdAt: new Date("2024-06-30"),
                                },
                            }),
                            prisma.reporting.create({
                                data: {
                                    type: "Demandes Approuvées",
                                    date: new Date("2024-07-31"),
                                    createdAt: new Date("2024-07-31"),
                                },
                            }),
                            prisma.reporting.create({
                                data: {
                                    type: "Commandes Livrées",
                                    date: new Date("2024-08-31"),
                                    createdAt: new Date("2024-08-31"),
                                },
                            }),
                        ])];
                case 13:
                    // 10. Créer des rapports (Reporting)
                    _a.sent();
                    console.log("Seeding terminé avec succès !");
                    return [3 /*break*/, 17];
                case 14:
                    error_1 = _a.sent();
                    console.error("Erreur lors du seeding:", error_1);
                    return [3 /*break*/, 17];
                case 15: return [4 /*yield*/, prisma.$disconnect()];
                case 16:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 17: return [2 /*return*/];
            }
        });
    });
}
seed();
