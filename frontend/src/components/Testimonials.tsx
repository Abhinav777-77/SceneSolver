
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    body: "CrimeSleuth AI has revolutionized our department's investigation process. We solved a cold case within weeks of implementing the platform.",
    author: {
      name: "Det. Sarah Johnson",
      role: "Lead Investigator, Boston PD",
      initial: "SJ",
    },
  },
  {
    body: "The pattern recognition capabilities identified crucial evidence that we had overlooked during our initial walkthrough. Truly game-changing technology.",
    author: {
      name: "Dr. Michael Chen",
      role: "Forensic Scientist, FBI",
      initial: "MC",
    },
  },
  {
    body: "Report generation alone has saved our team dozens of hours per case. The AI insights have proven invaluable for developing new investigative leads.",
    author: {
      name: "Lt. Carlos Rodriguez",
      role: "Special Crimes Unit, Miami",
      initial: "CR",
    },
  },
];

export function Testimonials() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 text-forensic">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by forensic professionals worldwide
          </p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, testimonialIdx) => (
              <div
                key={testimonialIdx}
                className="rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border"
              >
                <blockquote className="text-base leading-7">
                  <p>"{testimonial.body}"</p>
                </blockquote>
                <div className="mt-6 flex items-center gap-x-4">
                  <Avatar>
                    <AvatarFallback className="bg-forensic text-white">
                      {testimonial.author.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{testimonial.author.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.author.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
