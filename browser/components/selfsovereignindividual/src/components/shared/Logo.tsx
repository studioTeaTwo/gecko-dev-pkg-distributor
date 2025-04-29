import * as React from "react";

interface Props {
  size: string;
}

// The Bitcoin symbol is public domain.
// https://github.com/BitcoinDesign/Bitcoin-Icons
export const BitcoinLogo = (props: Props) => {
  const { size, ...otherProps } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="black"
      stroke="white"
      {...otherProps}
    >
      <path d="M20.247 14.052a8.502 8.502 0 01-10.302 6.194C5.394 19.11 2.62 14.5 3.754 9.95c1.134-4.551 5.74-7.33 10.288-6.195 4.562 1.12 7.337 5.744 6.205 10.298z" />
      <path
        strokeLinecap="square"
        strokeLinejoin="round"
        d="M9.4 14.912l1.693-6.792M9.637 7.757L13.818 8.8c2.728.68 2.12 3.877-.786 3.153 3.184.794 2.86 4.578-.907 3.639-1.841-.46-3.813-.95-3.813-.95M10.306 11.274l2.669.665M11.578 8.241l.363-1.455M9.521 16.489l.363-1.456M13.518 8.725l.363-1.455M11.462 16.973l.363-1.456"
      />
    </svg>
  );
};

BitcoinLogo.defaultProps = {
  size: "24",
};

// Under the Creative Commons Zero v1.0 Universal (CC0) license.
// https://github.com/mbarulli/nostr-logo
export const NostrLogo = (props: Props) => {
  const { size, ...otherProps } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="black"
      {...otherProps}
    >
      <path d="M210.8 199.4c0 3.1-2.5 5.7-5.7 5.7h-68c-3.1 0-5.7-2.5-5.7-5.7v-15.5c.3-19 2.3-37.2 6.5-45.5 2.5-5 6.7-7.7 11.5-9.1 9.1-2.7 24.9-.9 31.7-1.2 0 0 20.4.8 20.4-10.7s-9.1-8.6-9.1-8.6c-10 .3-17.7-.4-22.6-2.4-8.3-3.3-8.6-9.2-8.6-11.2-.4-23.1-34.5-25.9-64.5-20.1-32.8 6.2.4 53.3.4 116.1v8.4c0 3.1-2.6 5.6-5.7 5.6H57.7c-3.1 0-5.7-2.5-5.7-5.7v-144c0-3.1 2.5-5.7 5.7-5.7h31.7c3.1 0 5.7 2.5 5.7 5.7 0 4.7 5.2 7.2 9 4.5 11.4-8.2 26-12.5 42.4-12.5 36.6 0 64.4 21.4 64.4 68.7v83.2ZM150 99.3c0-6.7-5.4-12.1-12.1-12.1s-12.1 5.4-12.1 12.1 5.4 12.1 12.1 12.1S150 106 150 99.3Z" />
    </svg>
  );
};

NostrLogo.defaultProps = {
  size: "24",
};
