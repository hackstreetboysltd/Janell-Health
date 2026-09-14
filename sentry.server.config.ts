import * as Sentry from "@sentry/nextjs";
import { buildSentryOptions } from "./src/lib/sentry-options";

Sentry.init(buildSentryOptions());
