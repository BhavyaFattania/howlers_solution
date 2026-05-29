import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const NGO_ROLES       = new Set(["coordinator", "admin", "field_worker"]);
const VOLUNTEER_ROLES = new Set(["volunteer"]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env vars are missing (e.g. misconfigured deployment), fail closed.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[middleware] CRITICAL: Supabase environment configuration is missing.");
    return new NextResponse("Internal Server Error: Missing Configuration", { status: 500 });
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (xs: { name: string; value: string; options: CookieOptions }[]) => {
          xs.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          xs.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  // role is undefined if the user has no metadata — we only enforce when it is explicitly set
  const role = (user?.user_metadata as { role?: string } | undefined)?.role;

  const path = request.nextUrl.pathname;
  const onCoordinator = path.startsWith("/coordinator");
  const onVolunteer   = path.startsWith("/volunteer");
  const isProtected   = onCoordinator || onVolunteer || path.startsWith("/admin");

  // 1. Unauthenticated → redirect to login
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && role) {
    // 2. Known volunteer on coordinator routes → send to volunteer portal
    if (onCoordinator && VOLUNTEER_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/volunteer/feed";
      return NextResponse.redirect(url);
    }

    // 3. Known NGO role on volunteer routes → send to coordinator console
    if (onVolunteer && NGO_ROLES.has(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/coordinator/mission-control";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
