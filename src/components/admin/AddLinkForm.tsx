import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TronButton } from "../TronButton";

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

const CATEGORIES = [
  "Health",
  "Education",
  "Transportation",
  "Legal",
  "Employment",
  "Environment",
  "Housing",
  "Taxes",
  "Solicitations",
];

export function AddLinkForm() {
  const addLink = useMutation(api.links.addLink);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const stateCode = formData.get("stateCode") as string;
    const stateName = US_STATES.find((s) => s.code === stateCode)?.name ?? "";

    try {
      await addLink({
        title: formData.get("title") as string,
        url: formData.get("url") as string,
        stateCode,
        stateName,
        category: formData.get("category") as string,
        description: (formData.get("description") as string) || undefined,
      });
      setMessage({ text: "Link added successfully!", type: "success" });
      e.currentTarget.reset();
    } catch (error) {
      setMessage({
        text: "Failed to add link. Please try again.",
        type: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-tron-cyan mb-1">
          Title *
        </label>
        <input
          name="title"
          type="text"
          required
          disabled={isPending}
          className="tron-input w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
          placeholder="e.g., California DMV"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-tron-cyan mb-1">
          URL *
        </label>
        <input
          name="url"
          type="url"
          required
          disabled={isPending}
          className="tron-input w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-tron-cyan mb-1">
            State *
          </label>
          <select
            name="stateCode"
            required
            disabled={isPending}
            className="tron-input w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
          >
            <option value="" className="bg-tron-bg-card">Select...</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code} className="bg-tron-bg-card">
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-tron-cyan mb-1">
            Category *
          </label>
          <select
            name="category"
            required
            disabled={isPending}
            className="tron-input w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
          >
            <option value="" className="bg-tron-bg-card">Select...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-tron-bg-card">
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-tron-cyan mb-1">
          Description
        </label>
        <textarea
          name="description"
          disabled={isPending}
          rows={3}
          className="tron-input w-full px-3 py-2 bg-tron-bg-card border border-tron-cyan/20 rounded-lg text-tron-white placeholder-tron-gray focus:outline-none focus:ring-2 focus:ring-tron-cyan focus:border-tron-cyan disabled:opacity-50"
          placeholder="Brief description of this resource..."
        />
      </div>

      <TronButton
        type="submit"
        disabled={isPending}
        variant="primary"
        color="cyan"
        className="w-full"
        loading={isPending}
      >
        {isPending ? "Adding..." : "Add Link"}
      </TronButton>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-neon-success" : "text-neon-error"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
