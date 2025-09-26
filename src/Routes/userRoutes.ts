import express from "express";
import { authenticate } from "../Middlewares/auth";
import { authorize } from "../Middlewares/authorize";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUsersByPointVente,
  getUsersByRegion,
  updateUser,
} from "../Controllers/userController";
import { upload } from "../Middlewares/upload";

const usersRouter = express.Router();


usersRouter.get(
  "/pointvente/:pointVenteId",
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
usersRouter.post("/", upload.single("image"),  createUser);

usersRouter.put("/", upload.single("image"), authenticate, updateUser);

usersRouter.delete(
  "/:userId",
  authenticate,
  authorize(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  deleteUser,
);
export default usersRouter;
