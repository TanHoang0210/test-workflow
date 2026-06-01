/// <reference types="vite/client" />

declare module 'vuesax-icons-react' {
  import type { FC, SVGProps } from 'react';
  type IconProps = SVGProps<SVGSVGElement> & { size?: number | string; color?: string };
  export const ArrowRotateLeft: FC<IconProps>;
  export const ArrowRotateRight: FC<IconProps>;
  export const Setting: FC<IconProps>;
  const _default: Record<string, FC<IconProps>>;
  export default _default;
}
