"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity } from "./ActivityCard";

interface ActivityFormProps {
  activity?: Activity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "location", label: "Location" },
  { value: "activity", label: "Activity" },
  { value: "restaurant", label: "Restaurant" },
  { value: "dish", label: "Dish" },
  { value: "film", label: "Film/Show" },
];

const STATUSES = [
  { value: "wishlist", label: "Wishlist" },
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const COSTS = [
  { value: "low", label: "$ - Budget" },
  { value: "medium", label: "$$ - Moderate" },
  { value: "high", label: "$$$ - Expensive" },
  { value: "splurge", label: "$$$$ - Splurge" },
];

const DURATIONS = [
  { value: "quick", label: "Quick (< 2 hours)" },
  { value: "half-day", label: "Half day" },
  { value: "full-day", label: "Full day" },
  { value: "weekend", label: "Weekend" },
  { value: "week+", label: "Week or more" },
];

const SEASONS = [
  { value: "any", label: "Any time" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
];

export function ActivityForm({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: ActivityFormProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("activity");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("wishlist");
  const [url, setUrl] = useState("");
  const [location, setLocation] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [duration, setDuration] = useState("");
  const [season, setSeason] = useState("");
  const [priority, setPriority] = useState("medium");
  const [completedDate, setCompletedDate] = useState("");
  const [rating, setRating] = useState("");
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setCategory(activity.category);
      setImageUrl(activity.imageUrl || "");
      setNotes(activity.notes || "");
      setStatus(activity.status);
      setUrl(activity.url || "");
      setLocation(activity.location || "");
      setEstimatedCost(activity.estimatedCost || "");
      setDuration(activity.duration || "");
      setSeason(activity.season || "");
      setPriority(activity.priority || "medium");
      setCompletedDate(activity.completedDate || "");
      setRating(activity.rating?.toString() || "");
      setReview(activity.review || "");
    } else {
      setTitle("");
      setCategory("activity");
      setImageUrl("");
      setNotes("");
      setStatus("wishlist");
      setUrl("");
      setLocation("");
      setEstimatedCost("");
      setDuration("");
      setSeason("");
      setPriority("medium");
      setCompletedDate("");
      setRating("");
      setReview("");
    }
  }, [activity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        category,
        imageUrl: imageUrl.trim() || null,
        notes: notes.trim() || null,
        status,
        url: url.trim() || null,
        location: location.trim() || null,
        estimatedCost: estimatedCost || null,
        duration: duration || null,
        season: season || null,
        priority,
        completedDate: completedDate || null,
        rating: rating ? parseInt(rating) : null,
        review: review.trim() || null,
      };

      const apiUrl = activity ? `/api/together/${activity.id}` : "/api/together";
      const method = activity ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving activity:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? "Edit Activity" : "Add to To-Do Together"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Visit the Louvre"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details or thoughts..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL / Link</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Address</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Paris, France"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Cost</Label>
              <Select value={estimatedCost} onValueChange={setEstimatedCost}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {COSTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="season">Best Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "completed" && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">
                Completion Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="completedDate">Date Completed</Label>
                  <Input
                    id="completedDate"
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Select value={rating} onValueChange={setRating}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Rate it..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <SelectItem key={r} value={r.toString()}>
                          {"★".repeat(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review">Review / Reflection</Label>
                <Textarea
                  id="review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="How was it? What did you love?"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting
                ? "Saving..."
                : activity
                ? "Update"
                : "Add to List"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
