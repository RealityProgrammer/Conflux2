import {type HTMLAttributes, useEffect, useRef} from "react";
import {createTimeline} from "animejs";
import {BsGearFill} from "react-icons/bs";

interface AnimatedGearIconProps extends HTMLAttributes<SVGElement> {
}

export default function AnimatedGearIcon({
  ...props
}: AnimatedGearIconProps) {
  const gearIcon = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gearIcon.current) return;

    const timeline = createTimeline({
      loop: true,
    });

    timeline.add(gearIcon.current, {
      rotate: '+=45deg',
      duration: 500,
      delay: 1000,
      ease: 'inOutBack(2.5)',
    });

    return () => {
      timeline.pause();
    };
  }, []);

  return (
    <div ref={gearIcon}>
      {<BsGearFill {...props}/>}
    </div>
  );
}