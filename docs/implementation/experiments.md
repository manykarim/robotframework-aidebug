# Experiment Results

## Environment

- Date: 2026-03-08
- Python: managed with `uv run`
- Cache override: `UV_CACHE_DIR=$PWD/.uv-cache`
- Robot Framework: `7.4.2`

## Experiment 1: Raw Body Fragments Versus Wrapped Snippets

### Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run python - <<'PY'
from robot.api.parsing import get_model
from robot.running import TestSuite

cases = {
    'raw_keyword': 'Log    hi\n',
    'wrapped_keyword': '*** Test Cases ***\nDemo\n    Log    hi\n',
    'raw_if': 'IF    True\n    Log    yes\nEND\n',
    'wrapped_if': '*** Test Cases ***\nDemo\n    IF    True\n        Log    yes\n    END\n',
}
for name, src in cases.items():
    model = get_model(src)
    sections = [type(s).__name__ for s in model.sections]
    print(f'{name}: sections={sections}')
    suite = TestSuite.from_model(model)
    print(f'  runnable=True tests={[t.name for t in suite.tests]}')
PY
```

### Output

```text
raw_keyword: sections=['ImplicitCommentSection']
  runnable=True tests=[]
wrapped_keyword: sections=['TestCaseSection']
  runnable=True tests=['Demo']
raw_if: sections=['ImplicitCommentSection']
  runnable=True tests=[]
wrapped_if: sections=['TestCaseSection']
  runnable=True tests=['Demo']
```

### Conclusion

Raw body fragments do not become executable test bodies. A synthetic test-case wrapper is required for snippet execution.

## Experiment 2: Variable Replacement Versus Expression Evaluation Syntax

### Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run python - <<'PY'
from robot.variables import Variables
from robot.variables.replacer import VariableReplacer
from robot.variables.evaluation import evaluate_expression

variables = Variables()
variables['${NAME}'] = 'Ada'
variables['${COUNT}'] = 3
replacer = VariableReplacer(variables)
print('replace_scalar(${NAME})=', replacer.replace_scalar('${NAME}'))
print('replace_string(Hello ${NAME})=', replacer.replace_string('Hello ${NAME}'))
print('evaluate_expression($COUNT + 1)=', evaluate_expression('$COUNT + 1', variables))
try:
    print('evaluate_expression(${COUNT} + 1)=', evaluate_expression('${COUNT} + 1', variables))
except Exception as e:
    print('evaluate_expression(${COUNT} + 1)=ERROR', type(e).__name__, e)
PY
```

### Output

```text
replace_scalar(${NAME})= Ada
replace_string(Hello ${NAME})= Hello Ada
evaluate_expression($COUNT + 1)= 4
evaluate_expression(${COUNT} + 1)=ERROR DataError Evaluating expression '${COUNT} + 1' failed: SyntaxError: invalid syntax (<string>, line 1)

Variables in the original expression '${COUNT} + 1' were resolved before the expression was evaluated. Try using '$COUNT + 1' syntax to avoid that. See Evaluating Expressions appendix in Robot Framework User Guide for more details.
```

### Conclusion

The docs must distinguish replacement syntax from expression syntax. This directly affects any live snippet or expression execution feature.

## Experiment 3: Local Reference Benchmark

### Command

```bash
mkdir -p .uv-cache && UV_CACHE_DIR=$PWD/.uv-cache uv run python -m robotframework_aidebug.benchmark
```

### Output Summary

```json
{
  "benchmarks": [
    {"name": "get_state", "avg_ms": 0.0197, "p95_ms": 0.0281},
    {"name": "variables_snapshot", "avg_ms": 0.0475, "p95_ms": 0.0644},
    {"name": "execute_keyword", "avg_ms": 0.1984, "p95_ms": 0.2443},
    {"name": "execute_snippet_cached", "avg_ms": 0.5522, "p95_ms": 0.7096},
    {"name": "execute_snippet_cold", "avg_ms": 1.4174, "p95_ms": 1.9452},
    {"name": "set_variable", "avg_ms": 0.0384, "p95_ms": 0.0496}
  ]
}
```

### Conclusion

The local prototype is not proof of live transport performance, but it confirms that core runtime helpers are comfortably below interactive latency targets. The live implementation should spend its performance budget mainly on transport, synchronization, and policy overhead.

## Design Impact

1. Snippet execution must always use a wrapper.
2. Expression-based evaluation must use Robot Framework's `$VAR` expression form where applicable.
3. Performance work should prioritize transport, event handling, and caching discipline rather than micro-optimizing the already-fast local helpers.
