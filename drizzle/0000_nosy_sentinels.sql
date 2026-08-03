CREATE TYPE "public"."budget_bracket" AS ENUM('under_500', '500_1500', '1500_4000', '4000_plus', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."contact_pref" AS ENUM('whatsapp', 'email', 'call');--> statement-breakpoint
CREATE TYPE "public"."sector" AS ENUM('food_mouneh', 'fashion', 'beauty', 'restaurants', 'tourism', 'retail', 'professional_services', 'real_estate', 'exporter', 'startup', 'other');--> statement-breakpoint
CREATE TYPE "public"."service_interest" AS ENUM('websites', 'shopify-ecommerce', 'social-media', 'ai-automation', 'consulting', 'unsure');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'reviewing', 'contacted', 'closed');--> statement-breakpoint
CREATE TABLE "assessment_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text NOT NULL,
	"sector" "sector" NOT NULL,
	"website_url" text,
	"instagram_handle" text,
	"team_size" text,
	"biggest_blocker" text NOT NULL,
	"ninety_day_goal" text,
	"budget" "budget_bracket" NOT NULL,
	"contact_preference" "contact_pref" NOT NULL,
	"consent_contact" boolean DEFAULT false NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer_url" text,
	"landing_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text,
	"email" text NOT NULL,
	"whatsapp" text,
	"interest" "service_interest" NOT NULL,
	"message" text NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer_url" text,
	"landing_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"referrer_url" text,
	"landing_path" text,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
