import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  farmerId: string;
  customerId: string;
  productTitle: string;
  onRatingSubmitted?: () => void;
}

export const RatingDialog = ({
  isOpen,
  onClose,
  orderId,
  farmerId,
  customerId,
  productTitle,
  onRatingSubmitted,
}: RatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("farmer_ratings").insert({
        farmer_id: farmerId,
        customer_id: customerId,
        order_id: orderId,
        rating,
        review: review || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already rated this order");
        } else {
          throw error;
        }
      } else {
        toast.success("Thank you for your feedback!");
        onRatingSubmitted?.();
        onClose();
      }
    } catch (err) {
      console.error("Error submitting rating:", err);
      toast.error("Failed to submit rating");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            How was your experience with <strong>{productTitle}</strong>?
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? "text-warning fill-warning"
                      : "text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </p>

          {/* Review Text */}
          <div>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
            />
          </div>

          <Button
            variant="farmer"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
