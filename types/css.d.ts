declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}

// Allow side-effect CSS imports
declare module '*.css';
