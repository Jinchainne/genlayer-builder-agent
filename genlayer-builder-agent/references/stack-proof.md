# Stack Proof

When auditing code, look for proof that the GenLayer stack is exercised, not
merely described.

Useful evidence includes:

- intelligent contract methods for write and view flows
- non-deterministic web or LLM execution in the contract
- app or client deploy, write, wait, and read-back logic
- wallet connection and transaction submission
- state reads after resolution or execution
- tests or scripts that invoke the real workflow

Weak evidence includes:

- screenshots without code
- mock JSON standing in for contract results
- placeholder buttons with no integration file behind them
