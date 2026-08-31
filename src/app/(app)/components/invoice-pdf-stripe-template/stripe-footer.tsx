import { Text, View } from "@react-pdf/renderer/lib/react-pdf.browser";
import { type InvoiceData } from "@/app/schema";
import { TRANSLATIONS } from "@/app/schema/translations";
import dayjs from "dayjs";

import type { STRIPE_TEMPLATE_STYLES } from ".";

export function StripeFooter({
  invoiceData,
  formattedInvoiceTotal,
  styles,
}: {
  invoiceData: InvoiceData;
  formattedInvoiceTotal: string;
  styles: typeof STRIPE_TEMPLATE_STYLES;
}) {
  const language = invoiceData.language;
  const t = TRANSLATIONS[language];

  const invoiceNumberValue = invoiceData?.invoiceNumberObject?.value;
  const invoiceNumber = `${invoiceNumberValue}`;

  const paymentDueDate = dayjs(invoiceData.paymentDue).format(
    invoiceData.dateFormat,
  );

  return (
    <View style={styles.footer} fixed>
      <View style={styles.spaceBetween}>
        <View style={[styles.row, { gap: 3 }]}>
          {invoiceNumber && (
            <>
              <Text style={[styles.fontSize8]}>{invoiceNumber}</Text>
              <Text style={[styles.fontSize8]}>·</Text>
            </>
          )}
          <Text style={[styles.fontSize8]}>
            {formattedInvoiceTotal} {t.stripe.due} {paymentDueDate}
          </Text>
        </View>
        <Text
          style={[styles.fontSize8]}
          render={({ pageNumber, totalPages }) =>
            `${t.stripe.page} ${pageNumber} ${t.stripe.of} ${totalPages}`
          }
        />
      </View>
    </View>
  );
}
