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

const sparkleKeyframes = `
@keyframes sparkle-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const SparkleIcon = () => (
  <>
    <style>{sparkleKeyframes}</style>
    <svg
      viewBox="0 0 1240 1240"
      aria-hidden="true"
      className="ml-2 h-2.5 w-2.5 flex-none opacity-100 group-hover:opacity-100 group-hover:[animation:sparkle-spin_0.6s_ease-in-out_forwards]"
    >
      <g transform="matrix(0.999538,0,0,0.999539,-1859.168884,-1133.128299)">
        <path
          fill="currentColor"
          d="M3092.268,1744.08C3097.079,1744.892 3100.601,1749.058 3100.601,1753.937C3100.601,1758.816 3097.079,1762.982 3092.268,1763.794C2784.427,1814.774 2541.152,2058.049 2490.172,2365.89C2489.36,2370.701 2485.194,2374.223 2480.315,2374.223C2475.436,2374.223 2471.27,2370.701 2470.458,2365.89C2419.478,2058.049 2176.203,1814.774 1868.361,1763.794C1863.55,1762.982 1860.028,1758.816 1860.028,1753.937C1860.028,1749.058 1863.55,1744.892 1868.361,1744.08C2176.203,1693.1 2419.478,1449.825 2470.458,1141.984C2471.27,1137.173 2475.436,1133.651 2480.315,1133.651C2485.194,1133.651 2489.36,1137.173 2490.172,1141.984C2541.152,1449.825 2784.427,1693.1 3092.268,1744.08Z"
        />
      </g>
    </svg>
  </>
);

export default function ButtonCta(props: ButtonProps) {
  const { children, className = "", ...rest } = props;
  const classes = `${baseClasses} ${className}`;

  if ("href" in props && props.href) {
    const { href, target, rel, ...anchorProps } = rest as AnchorButtonProps;
    return (
      <a
        href={href}
        className={classes}
        target={target}
        rel={rel}
        {...anchorProps}
      >
        {children}
        <SparkleIcon />
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
      <SparkleIcon />
    </button>
  );
}
