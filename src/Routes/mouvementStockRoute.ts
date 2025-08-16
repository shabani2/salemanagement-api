
import express from 'express';
import { authenticate } from '../Middlewares/auth';
import { createMouvementStock, deleteMouvementStock, getMouvementById, listMouvementsStock, updateMouvementStock, validateMouvementStock } from '../Controllers/mouvementStockController';


const mouvementStockRoute = express.Router();

mouvementStockRoute.get('/', authenticate, listMouvementsStock);
mouvementStockRoute.get('/:id', authenticate, getMouvementById);
mouvementStockRoute.post('/', authenticate, createMouvementStock);
mouvementStockRoute.put('/:id', authenticate, updateMouvementStock);
mouvementStockRoute.delete('/:id', authenticate, deleteMouvementStock);
mouvementStockRoute.patch('/:id/validate', authenticate, validateMouvementStock);

export default mouvementStockRoute;
