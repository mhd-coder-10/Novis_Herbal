import CMS from '../models/CMS.js';

export class CMSService {
  static async getOrCreateCMS() {
    let cms = await CMS.findOne({ key: 'global_cms' });
    if (!cms) {
      cms = await CMS.create({ key: 'global_cms' });
    }
    return cms;
  }

  static async getCMSData() {
    return await this.getOrCreateCMS();
  }

  static async updateCMSData(updatePayload) {
    const cms = await CMS.findOneAndUpdate(
      { key: 'global_cms' },
      { $set: updatePayload },
      { new: true, runValidators: true, upsert: true }
    );
    return cms;
  }

  static async getPolicyContent(policyType) {
    const cms = await this.getOrCreateCMS();
    return cms.policies?.[policyType] || '';
  }
}
