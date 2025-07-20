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

usersRouter.delete(
  "/:userId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  deleteUser,
);
usersRouter.get(
  "/:pointVenteId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  getUsersByPointVente,
);
usersRouter.get(
  "/region/:regionId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion"]),
  getUsersByRegion,
);

usersRouter.get("/", authenticate, authorize(["SuperAdmin"]), getAllUsers);
usersRouter.get("/users", getAllUsers);
usersRouter.get(
  "/region",
  authenticate,
  authorize(["AdminRegion"]),
  getUsersByRegion,
);
// usersRouter.get(
//   "/point-vente",
//   authenticate,
//   authorize(["AdminPointVente"]),
//   getUsersByPointVente,
// );
usersRouter.put("/", authenticate, updateUser);

export default usersRouter;
