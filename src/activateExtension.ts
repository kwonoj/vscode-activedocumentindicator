import { ExtensionContext, window, Range, TextEditor, workspace, TextEditorDecorationType } from 'vscode';
import { fromEventPattern } from 'rxjs';
import { startWith, debounceTime, withLatestFrom, map, scan, filter } from 'rxjs/operators';

/**
 * Create new decorations for given opacity.
 *
 */
const getOpacityDecoration = (raw: number) =>
  window.createTextEditorDecorationType({
    opacity: `${raw / 100}`
  });

/**
 * Returns full document's range.
 * @param editor
 */
const getFullDocumentRange = (editor: TextEditor) => {
  const invalidRange = new Range(0, 0, editor.document.lineCount /*intentionally missing the '-1' */, 0);
  return editor.document.validateRange(invalidRange);
};

interface IndicatorConfiguration {
  enabled: boolean;
  opacity: number;
}

/**
 * Read current configurations
 */
const getConfiguration = (): IndicatorConfiguration => {
  const config = workspace.getConfiguration('activeDocumentIndicator');

  return {
    enabled: config.get('enabled', true),
    opacity: config.get('opacity', 50)
  };
};

/**
 * Apply opacity decorations to non-active text editors, clear for active editor
 * @param activeEditor
 */
const applyDecoration = ([activeEditor, config]: [
  TextEditor | undefined,
  { decoration: TextEditorDecorationType } | null
]) => {
  window.visibleTextEditors
    .map(editor => ({ editor, ranges: editor === activeEditor ? [] : [getFullDocumentRange(editor)] }))
    .forEach(({ editor, ranges }) => editor.setDecorations(config!.decoration, ranges));
};

/**
 * Creates Observable to subscribe configuration change with intiial value. Each time config changes, disposes existing decorations then emit new decorations.
 */
const getConfigChangeObservable = () =>
  fromEventPattern(workspace.onDidChangeConfiguration, (_h, subscription) => subscription.dispose()).pipe(
    map(getConfiguration),
    startWith(getConfiguration()),
    scan(
      (prev: IndicatorConfiguration & { decoration: TextEditorDecorationType } | null, cur: IndicatorConfiguration) => {
        // Reset existing config based decorations
        if (!!prev && prev.decoration) {
          //applyDecoration([undefined, { decoration: prev.decoration }]);
          prev.decoration.dispose();
        }

        return {
          ...cur,
          decoration: getOpacityDecoration(cur.opacity)
        } as any;
      },
      null
    )
  );

/**
 * Creates Observable to subscribe active editor changes.
 */
const getEditorChangeObservable = () =>
  fromEventPattern<TextEditor>(window.onDidChangeActiveTextEditor, (_h, subscription) => subscription.dispose());

/**
 * Activation extension
 */
const activate = (context: ExtensionContext) => {
  const subscription = getEditorChangeObservable()
    .pipe(
      startWith(window.activeTextEditor),
      withLatestFrom(getConfigChangeObservable()),
      debounceTime(100),
      filter(([, config]) => config!.enabled)
    )
    .subscribe(applyDecoration);

  context.subscriptions.push({ dispose: subscription.unsubscribe.bind(subscription) });
};

export { activate };
