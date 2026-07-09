import { z } from 'zod';
import { questionSchema, scriptSchema } from './interviewScript.js';
import { progressSchema } from './state.js';
import { gateSchema, gatePolicySchema } from './gatePolicy.js';
import { shapeSchema, shapesRegistrySchema, type Shape, type ShapesRegistry } from '../loadShapes.js';

export {
  questionSchema,
  scriptSchema,
  progressSchema,
  gateSchema,
  gatePolicySchema,
  shapeSchema,
  shapesRegistrySchema,
};

export type Question = z.infer<typeof questionSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Gate = z.infer<typeof gateSchema>;
export type GatePolicy = z.infer<typeof gatePolicySchema>;
export type { Shape, ShapesRegistry };

