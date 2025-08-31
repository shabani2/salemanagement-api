"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../Middlewares/auth");
const authorize_1 = require("../Middlewares/authorize");
const userController_1 = require("../Controllers/userController");
const upload_1 = require("../Middlewares/upload");
const usersRouter = express_1.default.Router();
usersRouter.delete(
  "/:userId",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  userController_1.deleteUser,
);
usersRouter.get(
  "/:pointVenteId",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion", "AdminPointVente"]),
  userController_1.getUsersByPointVente,
);
usersRouter.get(
  "/region/:regionId",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin", "AdminRegion"]),
  userController_1.getUsersByRegion,
);
usersRouter.get(
  "/",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["SuperAdmin"]),
  userController_1.getAllUsers,
);
usersRouter.get("/users", userController_1.getAllUsers);
usersRouter.get(
  "/region",
  auth_1.authenticate,
  (0, authorize_1.authorize)(["AdminRegion"]),
  userController_1.getUsersByRegion,
);
// usersRouter.get(
//   "/point-vente",
//   authenticate,
//   authorize(["AdminPointVente"]),
//   getUsersByPointVente,
// );
usersRouter.put(
  "/",
  upload_1.upload.single("image"),
  auth_1.authenticate,
  userController_1.updateUser,
);
exports.default = usersRouter;
