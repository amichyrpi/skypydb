import React from "react";

interface AnchorButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  button?: never;
}

interface ButtonElementProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  href?: never;
}

type ButtonProps = AnchorButtonProps | ButtonElementProps;

const baseClasses =
  "group relative isolate inline-flex items-center justify-center overflow-hidden text-left before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] rounded-md shadow-[0_1px_theme(colors.white/0.07)_inset,0_1px_3px_theme(colors.gray.900/0.2)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-b before:from-white/20 before:opacity-50 hover:before:opacity-100 after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-md after:bg-gradient-to-b after:from-white/10 after:from-[46%] after:to-[54%] after:mix-blend-overlay text-sm h-[1.875rem] px-3 border-0 bg-gradient-to-b from-blue-b1 to-blue-b1 text-white hover:text-white hover:-translate-y-px transition-none";

export default function Button(props: ButtonProps) {
  const { children, className = "", ...rest } = props;
  const classes = `${baseClasses} ${className}`;

  if ("href" in props && props.href) {
    const { href, target, rel, ...anchorProps } = rest as AnchorButtonProps;
    return (
      <a
        href={href}
        className={classes}
        style={{ fontFamily: '"SF Pro Display", sans-serif' }}
        target={target}
        rel={rel}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      style={{ fontFamily: '"SF Pro Display", sans-serif' }}
      {...(rest as ButtonElementProps)}
    >
      {children}
    </button>
  );
}
