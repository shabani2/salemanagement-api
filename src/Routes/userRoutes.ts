import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  deleteUser,
  getAllUsers,
  getUsersByPointVente,
  getUsersByRegion,
  updateUser,
} from "../Controllers/userController";

const usersRouter = express.Router();

usersRouter.get("/", authenticate, authorize(["SuperAdmin"]), getAllUsers);
usersRouter.get("/users", getAllUsers);
usersRouter.get(
  "/region",
  authenticate,
  authorize(["AdminRegion"]),
  getUsersByRegion,
);
usersRouter.get(
  "/point-vente",
  authenticate,
  authorize(["AdminPointVente"]),
  getUsersByPointVente,
);
usersRouter.delete(
  "/:userId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  deleteUser,
);
usersRouter.put("/", authenticate, updateUser);

export default usersRouter;
