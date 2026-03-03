"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RpgPanel } from "@/components/rpg-panel"
import { useLanguage } from "@/components/language-provider"

export function FaqSection() {
  const { t } = useLanguage()

  const faqs = [
    {
      question: "What is Cambrilio?",
      answer:
        "Cambrilio is a community nft collection of 3,333 unique characters inspired by the Cambria game universe.",
    },
    {
      question: "How much does it cost to mint?",
      answer: "Minting is completely free! You only need to pay the gas fees on the Base network.",
    },
    {
      question: "Which blockchain is Cambrilio on?",
      answer: "Cambrilio is deployed on the Base network, ensuring low fees and fast transactions.",
    },
    {
      question: "Is this officially affiliated with Cambria?",
      answer: "No, Cambrilio is a community project and is not officially affiliated with or endorsed by Cambria.",
    },
  ]

  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-cinzel)] mb-12 text-center text-primary">
          {t("faq.title")}
        </h2>

        <RpgPanel>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/80">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </RpgPanel>
      </div>
    </section>
  )
}
