import { SignInButton } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <>
      <h1>Mesosphere Chat</h1>
      <h2>
        <SignInButton />
      </h2>
    </>
  );
}
