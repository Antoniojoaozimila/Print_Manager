import express from 'express';
import { list } from '../controllers/jobController.js';
import { authJwt } from '../middlewares/authJwt.js';
import { validate } from '../middlewares/validate.js';
import schemas from '../validators/schemas.js';

const router = express.Router();

router.get('/', authJwt, validate(schemas.listQuery, 'query'), list);

export default router;
