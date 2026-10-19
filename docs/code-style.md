# Code style

Write Angular the way Angular is written. Write Fastify the way Fastify is written. Use the framework's own pattern before a homemade one.

DRY, KISS, SOLID, and the other widely known practices are applied whenever they can be applied.

Do not add code the change does not need. When a readable version and a faster version disagree, write the readable one. Do not add a cache, a pool, or a clever loop until you can point at why the readable one is wrong.

A name says what the thing is. A comment exists only when the code cannot say it.

ESLint is the check. `npm run lint` must pass. An `eslint-disable` comment does not count. Do not use `any` or a type assertion. Sort imports. A binding that starts with `_` is the only unused one that may stay.

The principles above are not lint rules. The person who writes the change keeps them.
