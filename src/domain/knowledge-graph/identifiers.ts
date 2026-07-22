import { z } from "zod";

export const graphNodeIdSchema = z
  .string()
  .regex(/^kg_node_[a-z0-9]+(?:_[a-z0-9]+)*$/, "Must be a stable Knowledge Graph node ID")
  .brand<"GraphNodeId">();

export const graphEdgeIdSchema = z
  .string()
  .regex(/^kg_edge_[a-z0-9]+(?:_[a-z0-9]+)*$/, "Must be a stable Knowledge Graph edge ID")
  .brand<"GraphEdgeId">();

export const contentFingerprintSchema = z
  .string()
  .regex(/^fp_f1_[0-9a-f]{16}$/, "Must be a versioned deterministic content fingerprint")
  .brand<"ContentFingerprint">();

export const episodeIdSchema = z
  .string()
  .regex(/^episode_[a-z0-9]+(?:_[a-z0-9]+)*$/, "Must be a stable Episode ID")
  .brand<"EpisodeId">();

export type GraphNodeId = z.infer<typeof graphNodeIdSchema>;
export type GraphEdgeId = z.infer<typeof graphEdgeIdSchema>;
export type ContentFingerprint = z.infer<typeof contentFingerprintSchema>;
export type EpisodeId = z.infer<typeof episodeIdSchema>;
