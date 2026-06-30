# Promote first admin

Grant the `admin` role to your account (`nachusim@gmail.com`, already signed up) so you can access the Admin console and manage everyone else from there.

## Action

Insert an `admin` row into `user_roles` for your user id (`d77b8f47-…`), idempotent (skips if it already exists):

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('d77b8f47-40ee-40fd-a418-351d32f238b9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## After it runs

- Refresh the app — an **Admin** link appears in the sidebar and on your account page.
- From **Admin → Creators** you can promote moderators and verify creators; from **Admin → Queue** you can review and publish submissions.
- New submissions from the Contribute recorder flow into the queue; approving one publishes the story and awards the creator points.
