import { useUser } from "@clerk/clerk-react";

export default function Users() {
  const { user } = useUser();

  return (
    <p className="user-name">
      Logged in{user?.fullName ? ` as ${user.fullName}` : ""}
    </p>
  );
}
