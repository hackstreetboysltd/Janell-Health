import * as Sentry from "@sentry/nextjs";
import { buildSentryOptions } from "@/lib/sentry-options";

Sentry.init(buildSentryOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
