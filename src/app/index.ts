import { Request, ParamsDictionary, Response } from "express-serve-static-core";
import { IncomingMessage, ServerResponse } from "http";
import { ParsedQs } from "qs";
import app from "../index";

export default function handler(
  req:
    | IncomingMessage
    | Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
  res:
    | Response<any, Record<string, any>, number>
    | ServerResponse<IncomingMessage>,
) {
  return app(req, res);
}
