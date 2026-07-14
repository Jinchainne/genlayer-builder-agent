# Default Workflow

The recommended agent workflow is:

1. run the main judge
2. inspect non-determinism signals
3. inspect deploy, submit, resolve, and read-back coverage
4. generate a prioritized fix plan
5. produce a reviewer-facing submission report

This project is intentionally local-first so an AI coding agent can run the
whole pipeline in one workspace without remote services.
