import 'package:flutter/material.dart';

class ProductTile extends StatelessWidget {
  final Map<String, dynamic> product;
  final VoidCallback? onTap;

  const ProductTile({super.key, required this.product, this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(product['name'] ?? ''),
      subtitle: Text('Stock: ${product['stock_qty']} ${product['unit'] ?? ''}'),
      trailing: Text('₹${product['price']}'),
      onTap: onTap,
    );
  }
}
