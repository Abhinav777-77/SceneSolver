
import { Camera, FileSearch, FileText, Microscope, Brain, Clock } from "lucide-react";

const features = [
  {
    name: 'Advanced Image Analysis',
    description:
      'Our AI examines crime scene photographs to identify key evidence, anomalies, and patterns that may not be visible to the human eye.',
    icon: Camera,
  },
  {
    name: 'Forensic Pattern Recognition',
    description:
      'Automatically detect blood patterns, footprints, tool marks, and other critical forensic evidence using state-of-the-art computer vision.',
    icon: Microscope,
  },
  {
    name: 'Comprehensive Reporting',
    description:
      'Generate detailed reports with evidence cataloging, analysis findings, and potential leads to streamline your investigation workflow.',
    icon: FileText,
  },
  {
    name: 'Evidence Search & Correlation',
    description:
      'Search across cases to find similar evidence patterns or correlations that may connect seemingly unrelated crimes.',
    icon: FileSearch,
  },
  {
    name: 'AI-Driven Insights',
    description:
      'Leverage our neural networks to suggest investigative directions and highlight elements that warrant closer examination.',
    icon: Brain,
  },
  {
    name: 'Rapid Processing',
    description:
      'Save countless hours with our high-speed processing that delivers results in minutes rather than days or weeks.',
    icon: Clock,
  },
];

export function Features() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-forensic">Advanced Capabilities</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Transform your investigative process
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            CrimeSleuth AI combines the expertise of forensic science with cutting-edge artificial intelligence to revolutionize how crime scenes are analyzed.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-7xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="rounded-xl border bg-card p-6 shadow-sm">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7">
                  <feature.icon className="h-5 w-5 flex-none text-forensic" aria-hidden="true" />
                  {feature.name}
                </dt>
                <dd className="mt-4 text-base leading-7 text-muted-foreground">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
