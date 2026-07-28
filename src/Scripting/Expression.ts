import { QueryComponentOrError } from '../Query/QueryComponentOrError';
import { errorMessageForException } from '../lib/ExceptionTools';
import { EnableJsInTasksQueries } from '../Config/EnableJsInTasksQueries';
import { JsInTasksQueriesDisabledError } from './JsInTasksQueriesDisabledError';

export type ExpressionFunction = (...args: unknown[]) => unknown;

export class FunctionOrError extends QueryComponentOrError<ExpressionFunction> {}

/**
 * The name and value of a parameter, as a Tuple, for passing in to {@link parseExpression} and related functions.
 */
export type ExpressionParameter = [name: string, value: unknown];

/**
 * Compile an expression after the caller has checked the explicit opt-in setting.
 *
 * `Function` executes in the plugin's global context and is therefore deliberately
 * isolated here. It is retained only for backwards-compatible user expressions.
 */
function compileExpression(parameterNames: string[], input: string): ExpressionFunction {
    const compiled = new Function(...parameterNames, input);
    if (typeof compiled !== 'function') {
        throw new Error('Expression compiler did not return a function');
    }

    // The Function constructor has no generic callable signature. Keep this audited
    // conversion at the single dynamic-code boundary; all results remain unknown.
    return compiled as ExpressionFunction;
}

/**
 * Parse a JavaScript expression, and return either a Function or an error message in a string.
 * @param paramsArgs
 * @param arg
 *
 * @see evaluateExpression
 * @see evaluateExpressionOrCatch
 */
export function parseExpression(paramsArgs: ExpressionParameter[], arg: string): FunctionOrError {
    if (!EnableJsInTasksQueries.getInstance().get()) {
        throw new JsInTasksQueriesDisabledError();
    }

    try {
        const parameterNames = paramsArgs.map(([name]) => name);
        const input = arg.includes('return') ? arg : `return ${arg}`;
        if (arg) {
            return FunctionOrError.fromObject(arg, compileExpression(parameterNames, input));
        }
        // I have not managed to write a test that reaches here:
        return FunctionOrError.fromError(arg, `Problem parsing expression "${arg}"`);
    } catch (e) {
        return FunctionOrError.fromError(arg, errorMessageForException(`Failed parsing expression "${arg}"`, e));
    }
}

/**
 * Evaluate an arbitrary JavaScript expression, throwing an exception if the calculation failed.
 * @param expression
 * @param paramsArgs
 *
 * @see parseExpression
 * @see evaluateExpressionOrCatch
 */
export function evaluateExpression(expression: ExpressionFunction, paramsArgs: ExpressionParameter[]): unknown {
    if (!EnableJsInTasksQueries.getInstance().get()) {
        throw new JsInTasksQueriesDisabledError();
    }

    const parameterValues = paramsArgs.map(([_, value]) => value);
    return expression(...parameterValues);
}

/**
 * Evaluate an arbitrary JavaScript expression, returning an error message if the calculation failed.
 * @param expression
 * @param paramsArgs
 * @param arg
 *
 * @see parseExpression
 * @see evaluateExpression
 */
export function evaluateExpressionOrCatch(
    expression: ExpressionFunction,
    paramsArgs: ExpressionParameter[],
    arg: string,
): unknown {
    try {
        return evaluateExpression(expression, paramsArgs);
    } catch (e) {
        return errorMessageForException(`Failed calculating expression "${arg}"`, e);
    }
}
