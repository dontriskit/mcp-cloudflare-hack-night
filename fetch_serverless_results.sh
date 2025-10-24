#!/bin/bash

# Job IDs from the first batch
JOB_IDS=(
  "b443ff70-3d4a-4d32-8b55-aef208832089"  # cloudflare.com
  "1ed70885-e9df-4c17-a429-edcd96e24da7"  # workers.cloudflare.com
  "b6b11e63-4668-41a3-8f52-e6bcf3b0ac2a"  # vercel.com
  "68e2aa25-16bb-4132-9ada-ff6074e81d3a"  # netlify.com
  "825a385b-285d-4f4b-a51c-35ec637b3ba4"  # aws.amazon.com/lambda
  "84893ecd-4f68-472b-94c8-5b2dafcca55d"  # azure.microsoft.com/en-us/products/functions
  "1daf538c-275a-4549-89fc-baa11e6216e0"  # cloud.google.com/functions
  "92284187-e2b3-47f6-81aa-46a271704016"  # deno.com/deploy
  "b5476860-8e05-43c5-827d-bcfefa8460a5"  # fly.io
  "a8722246-889b-4cd6-9db2-9ea1337820d1"  # railway.app
  "05b94129-f884-4b04-b08c-da2704bb57c8"  # render.com
)

COMPANY_NAMES=(
  "cloudflare"
  "cloudflare-workers"
  "vercel"
  "netlify"
  "aws-lambda"
  "azure-functions"
  "google-cloud-functions"
  "deno-deploy"
  "fly-io"
  "railway"
  "render"
)

mkdir -p serverless_analysis

echo "Waiting for jobs to complete..."
sleep 30

echo "Fetching results..."
for i in "${!JOB_IDS[@]}"; do
  JOB_ID="${JOB_IDS[$i]}"
  COMPANY="${COMPANY_NAMES[$i]}"

  echo "Fetching ${COMPANY}..."

  # This would use the MCP API but since we're in bash, we'll do this via Claude Code
  echo "${JOB_ID}" > "serverless_analysis/${COMPANY}_job_id.txt"
done

echo "Job IDs saved. Use Claude Code to fetch the actual results."
