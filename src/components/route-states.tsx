import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";

export function RouteError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="grid place-items-center px-6 py-24 text-center">
      <div>
        <h1 className="font-serif text-2xl font-semibold">This didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export function RouteNotFound({ message = "We couldn't find that." }: { message?: string }) {
  return (
    <div className="grid place-items-center px-6 py-24 text-center">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link to="/" className="mt-5 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}
