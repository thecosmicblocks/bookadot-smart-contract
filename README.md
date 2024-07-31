## Bookadot Solidity Smart Contract

```mermaid
graph LR
A(Factory) -->|get| B[Config]
A(Factory) -->|use| C[EIP712]
A -->|deploy| D[Property]
D -->|deploy| E[Ticket]
E -->|add role| D
```


### Deploy step
1. Config
2. Ticket factory
3. Factory
