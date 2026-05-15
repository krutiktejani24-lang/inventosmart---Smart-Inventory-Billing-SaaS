import 'package:flutter/material.dart';

class AddProductScreen extends StatelessWidget {
  const AddProductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AddProduct')),
      body: const Center(
        child: Text('AddProduct — TODO: Generate with AI Assistant'),
      ),
    );
  }
}
