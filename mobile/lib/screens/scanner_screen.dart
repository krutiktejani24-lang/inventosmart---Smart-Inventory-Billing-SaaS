import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';
import 'stock_adjust_screen.dart';
import '../providers/inventory_provider.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with WidgetsBindingObserver {
  final MobileScannerController _ctrl = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing:         CameraFacing.back,
    torchEnabled:   false,
  );

  bool   _scanning   = true;
  bool   _processing = false;
  String _lastCode   = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ctrl.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:   _ctrl.stop();  break;
      case AppLifecycleState.resumed:  _ctrl.start(); break;
      default: break;
    }
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_scanning || _processing) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final code = barcode!.rawValue!;
    if (code == _lastCode) return;
    _lastCode = code;

    setState(() { _scanning = false; _processing = true; });

    try {
      // Search product by SKU
      final res      = await apiService.getProducts(search: code);
      final data     = res.data as Map<String, dynamic>;
      final products = data['products'] as List?;

      if (!mounted) return;

      if (products != null && products.isNotEmpty) {
        final product = Product.fromJson(products.first as Map<String, dynamic>);
        _showProductFound(product);
      } else {
        _showNotFound(code);
      }
    } catch (e) {
      if (mounted) _showError('Failed to lookup product');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  void _showProductFound(Product product) {
    showModalBottomSheet(
      context:      context,
      isScrollControlled: true,
      shape:        const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductFoundSheet(
        product:  product,
        onDone: () {
          Navigator.pop(context);
          setState(() { _scanning = true; _lastCode = ''; });
          _ctrl.start();
        },
        onAdjust: () {
          Navigator.pop(context);
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => StockAdjustScreen(product: product)),
          ).then((_) {
            setState(() { _scanning = true; _lastCode = ''; });
          });
        },
      ),
    ).then((_) {
      if (mounted) setState(() { _scanning = true; _lastCode = ''; });
    });
  }

  void _showNotFound(String code) {
    showModalBottomSheet(
      context: context,
      shape:   const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off_rounded, size: 48, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 12),
            const Text('Product Not Found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('No product with SKU: $code', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() { _scanning = true; _lastCode = ''; });
                },
                child: const Text('Scan Again'),
              ),
            ),
          ],
        ),
      ),
    ).then((_) {
      if (mounted) setState(() { _scanning = true; _lastCode = ''; });
    });
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: const Color(0xFFEF4444)),
    );
    setState(() { _scanning = true; _lastCode = ''; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Barcode Scanner', style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded, color: Colors.white),
            onPressed: () => _ctrl.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white),
            onPressed: () => _ctrl.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera view
         MobileScanner(
           onDetect: (capture) {
            if (_scanning) {
              _onDetect(capture);
            }
          },
        ),

          // Overlay
          CustomPaint(
            painter: _ScannerOverlayPainter(),
            child: const SizedBox.expand(),
          ),

          // Instructions
          Positioned(
            bottom: 60,
            left:   0,
            right:  0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color:        Colors.black54,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _processing
                        ? 'Looking up product...'
                        : 'Point camera at barcode or QR code',
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                ),
                if (_processing) ...[
                  const SizedBox(height: 12),
                  const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Scanner Overlay Painter ────────────────────────────────────────
class _ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.fill;

    const double boxSize   = 260;
    final double boxLeft   = (size.width  - boxSize) / 2;
    final double boxTop    = (size.height - boxSize) / 2;
    final Rect   scanRect  = Rect.fromLTWH(boxLeft, boxTop, boxSize, boxSize);
    final Rect   fullRect  = Rect.fromLTWH(0, 0, size.width, size.height);
    final Path   path      = Path()
      ..addRect(fullRect)
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(16)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    // Corners
    const double cLen = 24;
    const double cWidth = 3.5;
    final cp = Paint()
      ..color       = const Color(0xFF6366F1)
      ..style       = PaintingStyle.stroke
      ..strokeWidth = cWidth
      ..strokeCap   = StrokeCap.round;

    final corners = [
      [scanRect.topLeft,     Offset(scanRect.left + cLen, scanRect.top),    Offset(scanRect.left,  scanRect.top + cLen)],
      [scanRect.topRight,    Offset(scanRect.right - cLen, scanRect.top),   Offset(scanRect.right, scanRect.top + cLen)],
      [scanRect.bottomLeft,  Offset(scanRect.left + cLen, scanRect.bottom), Offset(scanRect.left,  scanRect.bottom - cLen)],
      [scanRect.bottomRight, Offset(scanRect.right - cLen, scanRect.bottom),Offset(scanRect.right, scanRect.bottom - cLen)],
    ];

    for (final c in corners) {
      canvas.drawLine(c[0] as Offset, c[1] as Offset, cp);
      canvas.drawLine(c[0] as Offset, c[2] as Offset, cp);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

// ── Product Found Sheet ────────────────────────────────────────────
class _ProductFoundSheet extends StatelessWidget {
  final Product    product;
  final VoidCallback onDone, onAdjust;

  const _ProductFoundSheet({
    required this.product,
    required this.onDone,
    required this.onAdjust,
  });

  @override
  Widget build(BuildContext context) {
    final stockColor = product.isOutOfStock
        ? const Color(0xFFEF4444)
        : product.isLowStock
            ? const Color(0xFFF59E0B)
            : const Color(0xFF10B981);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),

          // Product icon
          Container(
            width: 60, height: 60,
            decoration: BoxDecoration(
              color:        const Color(0xFFEEF2FF),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.inventory_2_rounded, color: Color(0xFF6366F1), size: 28),
          ),
          const SizedBox(height: 14),

          Text(product.name,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            textAlign: TextAlign.center,
          ),
          if (product.sku != null) ...[
            const SizedBox(height: 4),
            Text(product.sku!, style: const TextStyle(fontFamily: 'monospace', color: Color(0xFF94A3B8), fontSize: 12)),
          ],
          const SizedBox(height: 16),

          // Stock info
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color:        stockColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text('${product.stockQty}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: stockColor)),
                    Text(product.unit, style: TextStyle(fontSize: 11, color: stockColor)),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
                child: Column(
                  children: [
                    Text('₹${product.price}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    const Text('Price', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onDone,
                  style: OutlinedButton.styleFrom(
                    padding:      const EdgeInsets.symmetric(vertical: 14),
                    shape:        RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side:         const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: const Text('Scan Again'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: onAdjust,
                  style: ElevatedButton.styleFrom(
                    padding:    const EdgeInsets.symmetric(vertical: 14),
                    shape:      RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Adjust Stock'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}