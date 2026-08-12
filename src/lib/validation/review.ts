import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  comment: z.string().max(1000, "Review comment cannot exceed 1000 characters").optional().nullable(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
