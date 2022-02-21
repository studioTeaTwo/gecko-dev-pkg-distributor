#ifndef OnionAliasService_h_
#define OnionAliasService_h_

#include "IOnionAliasService.h"

#include "mozilla/RWLock.h"
#include "nsClassHashtable.h"
#include "nsHashKeys.h"
#include "ScopedNSSTypes.h"

namespace torproject {

class OnionAliasService final : public IOnionAliasService {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_IONIONALIASSERVICE

  static already_AddRefed<IOnionAliasService> GetSingleton();

 private:
  OnionAliasService() = default;
  OnionAliasService(const OnionAliasService&) = delete;
  OnionAliasService(OnionAliasService&&) = delete;
  OnionAliasService& operator=(const OnionAliasService&) = delete;
  OnionAliasService& operator=(OnionAliasService&&) = delete;
  virtual ~OnionAliasService() = default;

  // mLock protects access to mOnionAliases
  mozilla::RWLock mLock{"OnionAliasService.mLock"};

  // AutoCStrings have a 64 byte buffer, so it is advised not to use them for
  // long storage. However, it is enough to contain onion addresses, so we use
  // them instead, and avoid allocating on heap for each alias
  nsClassHashtable<nsCStringHashKey, nsAutoCString> mOnionAliases;
};

}  // namespace torproject

#endif  // OnionAliasService_h_
