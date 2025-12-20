import { USAMap } from "../components/USAMap";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface GovernmentLinkHubPageProps {
  isPublic?: boolean;
}

export function GovernmentLinkHubPage({ isPublic = false }: GovernmentLinkHubPageProps) {
  // Only query for user role if not in public mode (authenticated users)
  const userRole = useQuery(
    api.userRoles.getCurrentUserRole,
    isPublic ? "skip" : undefined
  );
  
  // Public users are never admins; authenticated users check their role
  const isAdmin = isPublic ? false : userRole === "admin";

  return (
    <div className="h-full bg-tron-bg-deep">
      <USAMap isAdmin={isAdmin} />
    </div>
  );
}
