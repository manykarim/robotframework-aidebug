# Experiment Results

## Environment

All experiments were run locally in this repository with `uv`.

- `uv`: `0.9.26`
- Python: `3.13.11`
- Robot Framework: `7.4.2`
- lockfile: [uv.lock](/home/many/workspace/robotframework-aidebug/uv.lock)

## How The Environment Was Prepared

```bash
uv sync
uv add --dev robotframework
```

## Experiment 1: Parse A Full Suite Model

### Goal

Confirm that Robot Framework's public parsing APIs are sufficient for a future structured execution path.

### Command

```bash
uv run python - <<'PY'
from robot.api.parsing import get_model
from robot.running import TestSuite

suite_text = '''*** Test Cases ***
Example
    ${value}=    Set Variable    42
    Log    ${value}
'''
model = get_model(suite_text)
suite = TestSuite.from_model(model)
print(type(model).__name__)
print([type(s).__name__ for s in model.sections])
print([t.name for t in suite.tests])
PY
```

### Result

- `get_model()` returned a `File` model.
- The model contained a `TestCaseSection`.
- `TestSuite.from_model()` produced a runnable `TestSuite` with one test named `Example`.

### Implication

Structured snippet execution can use public parsing APIs, but only if the content is expressed as a valid suite model.

## Experiment 2: Raw Body Fragments Are Not Executable Models

### Goal

Test whether a multi-line Robot body can be parsed directly without a synthetic wrapper.

### Command

```bash
uv run python - <<'PY'
from robot.api.parsing import get_model

for text in ['Log    hi\n', 'IF    True\n    Log    inside\nEND\n']:
    model = get_model(text)
    print([type(s).__name__ for s in model.sections], len(model.errors))
PY
```

### Result

Both samples produced an `ImplicitCommentSection` with zero parse errors.

### Implication

A future `robot/executeSnippet` implementation must wrap the body in a synthetic suite/test envelope before parsing. This is not optional.

## Experiment 3: Wrapped Control Flow Parses Correctly

### Goal

Verify that the wrapper approach can preserve structured body nodes such as `IF`.

### Command

```bash
uv run python - <<'PY'
from robot.api.parsing import get_model
from robot.running import TestSuite

snippet = 'IF    True\n    Log    inside\nEND\n'
wrapped = '*** Test Cases ***\nProbe\n' + '\n'.join('    ' + line for line in snippet.splitlines()) + '\n'
model = get_model(wrapped)
suite = TestSuite.from_model(model)
print(len(model.errors))
print([type(item).__name__ for item in suite.tests[0].body])
PY
```

### Result

- parse errors: `0`
- body item types: `['If']`

### Implication

The wrapper approach is compatible with structured Robot control flow and is a sound basis for the future snippet execution design.

## Experiment 4: Listener Version Behavior

### Goal

Verify how listener classes behave in Robot Framework 7.4.2 when the API version is omitted.

### Command Summary

A temporary suite was executed with three listeners:

- explicit v2 listener,
- explicit v3 listener,
- listener with no `ROBOT_LISTENER_API_VERSION`.

### Result

- v2 listener methods received `str` and `dict` style arguments.
- v3 listener methods received `TestSuite` and `TestCase` objects.
- the listener with no explicit API version also received the v3-style object arguments.

### Implication

Any new listener-adjacent documentation should assume v3-style behavior by default for Robot Framework 7.4.2, while preserving compatibility with existing RobotCode dual-listener usage.

## Experiment 5: Variable Replacement Versus Expression Evaluation

### Goal

Confirm the practical difference between variable replacement APIs and expression evaluation APIs.

### Command Summary

A temporary script used:

- `Variables.replace_scalar('${NAME}')`
- `Variables.replace_string('Hello ${NAME}!')`
- `evaluate_expression('$NUM * 6', vars_store)`
- `evaluate_expression('${NUM} * 6', vars_store)`

### Result

- scalar replacement returned `world`
- string replacement returned `Hello world!`
- `$NUM * 6` evaluated successfully to `42`
- `${NUM} * 6` raised a `DataError` caused by invalid syntax

### Implication

The documentation and future implementation must distinguish:

- variable replacement syntax for literal substitution,
- `$name` expression syntax for `evaluate_expression()`.

## Experiment 6: Variable Scope Semantics

### Goal

Confirm the behavior of test, suite, and global variable scopes in one Robot execution.

### Command Summary

Two temporary suites were executed.

- suite A set test, suite, and global variables,
- a later test in suite A checked visibility,
- suite B checked cross-suite visibility.

### Result

- test variable was missing in a later test,
- suite variable was visible inside the same suite,
- global variable was visible across suites in the same run.

### Implication

Future variable mutation tools must expose scope semantics explicitly and avoid implying that all mutations have the same visibility rules.

## Conclusion

The current design is supported by the local experiments, with one important refinement: snippet execution cannot rely on raw body parsing and must use a `SnippetEnvelope` pattern.
