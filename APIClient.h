//
//  APIClient.h - Kyojinx License SDK
//  Generated for: pedro00
//  DO NOT SHARE - method names are unique to your build
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface APIClient : NSObject
+ (instancetype)sharedAPIClient;
- (void)BwstMpltptacKBHkzURj12VuaeHziLlfbqWgi:(NSString *)token;
- (void)ufN9gRM8reKhfRpqmE24j2wxcR:(NSString *)version;
- (void)xYLnD1u5HhLSOAVXoebalBTQnPxg1S7oNhbyPpvnANaZAfmtX:(NSString *)name;
- (void)rcrWXMgTc6rf3ucFP0BuapgWCFjaLpf8d:(BOOL)show;
- (void)ggDGuZ3wwFlwFd5XBGZWuYzFoxDr9ZDssm4wP79:(const uint8_t *)bytes length:(size_t)len xorKey:(uint8_t)xk;
- (void)r5cwlReDGqbL7yasJsAkevNfpHmC:(const uint8_t *)bytes length:(size_t)len xorKey:(uint8_t)xk;
- (void)rxLPvp42t8DReuADcZ1iK2lGFFkUmcgmKxIffs2:(NSString *)hint;
- (void)htG6ckuLh8R1L3sA2M38LR5RMv5nXrmXuBNYgArpOiH:(const uint8_t *)bytes length:(size_t)len xorKey:(uint8_t)xk;
- (nullable NSString *)RfUff9EafkW7Rsqp4jcR2v3RgDde;
- (nullable NSString *)bb8Z8dykvEGtVEx1Wsntmcstjp2G9GeZbCgHF;
- (nullable NSString *)iWOVPmkykPkgZaPYgHqHG4vGnwLniLIdFLwLhvUTIWj;
- (nullable NSString *)tNLwkkICSVkQcfnLGO9uhGgMw1L9t4Wwaiv55XdB;
@end

NS_ASSUME_NONNULL_END

#ifdef __cplusplus
extern "C" {
#endif
void     _kx_run_paid_cb(APIClient * _Nullable api, void(^ _Nullable cb)(void));
void     _kx_run_paid(APIClient * _Nullable api);
void     _kx_assert_now(APIClient * _Nullable api);
uint64_t _kx_derive_offset(const char * _Nonnull key, const uint8_t * _Nonnull fk, uint8_t rxk);
const char * _Nullable _kx_derive_str(const char * _Nonnull key);
extern uint8_t _kx_fk[32];
extern uint8_t _kx_rxk;
#ifdef __cplusplus
}
#endif

#define vv56iX6sEn5RYKWbQbYMUNOIgIU5YgqIN_R(b) _kx_run_paid_cb(nil,(b))
#define rcrWXMgTc6rf3ucFP0BuapgWCFjaLpf8d_P()  _kx_run_paid(nil)
#define bb8Z8dykvEGtVEx1Wsntmcstjp2G9GeZbCgHF_A()  _kx_assert_now(nil)
#define RfUff9EafkW7Rsqp4jcR2v3RgDde_O(k) _kx_derive_offset((k), _kx_fk, _kx_rxk)
#define iWOVPmkykPkgZaPYgHqHG4vGnwLniLIdFLwLhvUTIWj_S(k) _kx_derive_str((k))
