export function assertElement<TElement extends Element>(
  element: TElement | null,
  message: string
): TElement {
  if (!element) {
    throw new Error(message);
  }

  return element;
}
