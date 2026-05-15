import 'package:flutter/material.dart';

class InvoiceCard extends StatelessWidget {
  final Map<String, dynamic> invoice;
  final VoidCallback? onTap;

  const InvoiceCard({super.key, required this.invoice, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(invoice['invoice_no'] ?? ''),
        subtitle: Text(invoice['customer']?['name'] ?? ''),
        trailing: Text('₹${invoice['total']}', style: const TextStyle(fontWeight: FontWeight.bold)),
        onTap: onTap,
      ),
    );
  }
}
