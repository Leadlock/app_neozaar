'use client';
import './StarBorder.css';

const StarBorder = ({
  as: Component = 'button',
  className = '',
  color = '#F97316',
  speed = '6s',
  thickness = 1,
  borderRadius = '20px',
  padding = '10px 24px',
  children,
  ...rest
}) => {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{ borderRadius, padding: `${thickness}px 0`, ...rest.style }}
      {...rest}
    >
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="star-inner-content"
        style={{ borderRadius, padding }}
      >
        {children}
      </div>
    </Component>
  );
};

export default StarBorder;
