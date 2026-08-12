import {useEffect, useRef, useState} from "react";
import {animate, type JSAnimation, stagger} from "animejs";

export type DialogueStep =
  {
    type: "text";
    text: string
  } | {
  type: "choice";
  options: {
    label: string;
    action?: () => void; // Trigger state changes (e.g., getting the egg)
    next: DialogueStep[]; // The dialogue path if this option is chosen
  }[];
};

function getDialogue(
  entity: "tree" | "man",
  flags: Record<string, boolean>,
  setFlag: (key: string, value: boolean
  ) => void): DialogueStep[] {
  const hasEgg: boolean = flags["hasEgg"];
  const ignoredEgg: boolean = flags["ignoredEgg"];

  switch (entity) {
    case "tree":
      if (hasEgg) {
        return [{type: "text", text: "(It is a tree.)"}];
      } else {
        return [{type: "text", text: "(He is behind the tree.)"}];
      }

    case "man":
      if (hasEgg || ignoredEgg) {
        return [{type: "text", text: "(Well, there is not a man here.)"}];
      } else {
        return [
          {type: "text", text: "(Well, there is a man here.)"},
          {type: "text", text: "(He offered you something.)"},
          {
            type: "choice",
            options: [
              {
                label: "Yes",
                action: () => setFlag("hasEgg", true),
                next: [
                  {type: "text", text: "(You received an Egg.)"},
                ],
              },
              {
                label: "No",
                action: () => setFlag("ignoredEgg", true),
                next: [
                  {type: "text", text: "(Then he needn't be here.)"}
                ]
              },
            ]
          },
        ];
      }
  }
}

export default function Egg() {
  // game state
  const [flags, setFlags] = useState<Record<string, boolean>>({hasEgg: false, ignoredEgg: false});
  const setFlag = (key: string, value: boolean) => setFlags(prev => ({...prev, [key]: value}));

  // Dialogue State
  const [showTextbox, setShowTextbox] = useState(false);
  const [currentDialog, setCurrentDialog] = useState<DialogueStep[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const textRef = useRef<HTMLParagraphElement | null>(null);
  const animationRef = useRef<JSAnimation | null>(null);

  const handleInteractTree = () => {
    const dialogue: DialogueStep[] = getDialogue("tree", flags, setFlag);

    setCurrentDialog(dialogue);
    setLineIndex(0);
    setShowTextbox(true);
  };

  const handleInteractMan = () => {
    const dialogue: DialogueStep[] = getDialogue("man", flags, setFlag);

    setCurrentDialog(dialogue);
    setLineIndex(0);
    setShowTextbox(true);
  };

  const currentStep = currentDialog[lineIndex];

  useEffect(() => {
    if (!showTextbox || !currentStep || currentStep.type !== "text" || !textRef.current) return;

    setIsTyping(true);

    const chars = textRef.current.querySelectorAll<HTMLSpanElement>('.dialog-char');
    chars.forEach(c => (c.style.opacity = '0'));

    // Anime.js v4 syntax
    animationRef.current = animate(chars, {
      opacity: [0, 1],
      duration: 10,
      delay: stagger(35),
      onComplete: () => setIsTyping(false)
    });

    return () => {
      if (animationRef.current) animationRef.current.cancel();
    };
  }, [lineIndex, currentDialog, showTextbox]);

  const handleTextboxContinuation = () => {
    if (!textRef.current || !showTextbox || !currentStep) return;

    if (currentStep.type === "choice") return;

    if (isTyping) {
      if (animationRef.current) animationRef.current.pause();
      const chars = textRef.current.querySelectorAll<HTMLSpanElement>('.dialog-char');
      chars.forEach(c => (c.style.opacity = '1'));
      setIsTyping(false);
    } else {
      if (lineIndex < currentDialog.length - 1) {
        setLineIndex(prev => prev + 1);
      } else {
        setShowTextbox(false);
      }
    }
  };

  const handleChoiceSelect = (option: any): void => {
    if (option.action) option.action(); // e.g., give the egg

    // Overwrite the current dialogue queue with the new branch and reset index
    setCurrentDialog(option.next);
    setLineIndex(0);
  };

  const characters = currentStep?.type === "text" ?
    currentStep.text.split('').map((char, i) => (
      <span key={i} className="dialog-char opacity-0">
                {char}
            </span>
    )) : null;

  return (
    <div
      className="min-h-0 flex-1 w-full mx-auto overflow-hidden flex items-center justify-center bg-black @container-size select-none">
      <div
        className="aspect-4/3 w-[min(100cqw,calc(100cqh*4/3))] h-[min(100cqh,calc(100cqw*3/4))] flex items-center justify-center relative"
        onClick={handleTextboxContinuation}
      >
        <audio
          src="https://soundcloud.com/deltarune-unused-ost/man-ogg?utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing"/>

        <img
          src="/secrets/tree.gif"
          className="w-1/3"
          style={{imageRendering: "pixelated"}}
          alt="Secret tree"
        />

        {!showTextbox && (
          <>
            <button
              className="absolute top-[35%] left-1/2 -translate-x-1/2 w-16 h-24 bg-transparent border-2 border-transparent cursor-pointer"
              aria-label="???"
              onClick={handleInteractMan}
            >
            </button>

            <button
              className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-24 h-12 bg-transparent border-2 border-transparent cursor-pointer"
              aria-label="tree"
              onClick={handleInteractTree}
            >
            </button>
          </>
        )}

        {/* textbox */}
        {showTextbox && currentStep && (
          <div
            className="absolute bottom-[4%] w-[92%] h-[30%] px-10 py-8 text-white font-[DeterminationMono] text-[42px]"
            style={{
              borderImage: "url('/secrets/textbox.png') 14 fill / 28px",
              imageRendering: "pixelated",
            }}
          >
            {currentStep.type === "text" ? (
              <div className="flex gap-x-4 h-full">
                                <span
                                  className="leading-[1.2]"
                                  style={{
                                    WebkitFontSmoothing: "none",
                                    MozOsxFontSmoothing: "grayscale",
                                    fontSmooth: "never",
                                    imageRendering: "pixelated",
                                  }}
                                >
                                    *
                                </span>

                <p
                  ref={textRef}
                  className="whitespace-pre-wrap leading-[1.2]"
                  style={{
                    WebkitFontSmoothing: "none",
                    MozOsxFontSmoothing: "grayscale",
                    fontSmooth: "never",
                    imageRendering: "pixelated",
                  }}
                >
                  {characters}
                </p>
              </div>
            ) : (
              <div className="flex flex-row gap-y-4 h-full items-center justify-between">
                {currentStep.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="group flex flex-row items-center gap-x-4 cursor-pointer group"
                    onClick={() => handleChoiceSelect(opt)}
                  >
                    <img
                      src="/secrets/soul.png"
                      className="size-6 invisible group-hover:visible"
                    />

                    <span className="leading-[1.3]">
                                            {opt.label}
                                        </span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}