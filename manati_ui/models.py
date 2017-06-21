from __future__ import unicode_literals
import datetime
from django.db import models, migrations
from django.utils import timezone
from django.contrib.auth.models import User
from model_utils import Choices
from model_utils.fields import AutoCreatedField, AutoLastModifiedField
from django.utils.translation import ugettext_lazy as _
from django.db import IntegrityError, transaction
from django.contrib.messages import constants as message_constants
from django.core.exceptions import ValidationError
from django_enumfield import enum
from threading import Thread
from utils import *
import json
from jsonfield import JSONField
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericRelation
from django.core import management
from ipwhois import IPWhois
import whois
from share_modules.virustotal import *
from share_modules.util import get_domain_by_obj
vt = vt()
from parsedata import dataGather

# from django.db.models.signals import post_save
# from django.dispatch import receiver

MESSAGE_TAGS = {
    message_constants.DEBUG: 'info',
    message_constants.INFO: 'info',
    message_constants.SUCCESS: 'success',
    message_constants.WARNING: 'warning',
    message_constants.ERROR: 'danger',
}


def postpone(function):
  def decorator(*args, **kwargs):
    t = Thread(target = function, args=args, kwargs=kwargs)
    t.daemon = True
    t.start()
  return decorator


@postpone
def delete_threading(previous_exist):
    previous_exist.delete()


class AnalysisSessionManager(models.Manager):

    @transaction.atomic
    def create(self, filename, key_list, weblogs, current_user,type_file):
        try:
            analysis_session = AnalysisSession(type_file=type_file)
            wb_list = []
            previous_exists = AnalysisSession.objects.filter(name=filename, users__id=current_user.id)
            if previous_exists.count() > 0:
                count = 1
                while previous_exists.count() > 0:
                    copy_filename = filename + " " + "(" + str(count) + ")"
                    previous_exists = AnalysisSession.objects.filter(name=copy_filename, users__id=current_user.id)
                    count += 1

                filename = copy_filename

            with transaction.atomic():
                analysis_session.name = filename
                analysis_session.clean()
                analysis_session.save()
                analysis_sessions_users = AnalysisSessionUsers.objects.create(analysis_session_id=analysis_session.id,
                                                                              user_id=current_user.id,
                                                                              columns_order=json.dumps(key_list))
                for elem in weblogs:
                    i = 0
                    hash_attr = {}
                    if (type_file == 'argus_netflow'):
                        for k in key_list:
                            hash_attr[k] = elem[i]
                            i += 1
                    else:
                        for k in key_list:
                            hash_attr[k['column_name']] = elem[i]
                            i += 1
                    verdict = hash_attr["verdict"]
                    dt_id = hash_attr["dt_id"]
                    hash_attr.pop("db_id", None)
                    hash_attr.pop("register_status", None)
                    hash_attr.pop('verdict', None)
                    hash_attr.pop('dt_id', None)
                    wb = Weblog.objects.create(analysis_session_id=analysis_session.id,
                                               register_status=RegisterStatus.READY,
                                               id=dt_id,
                                               verdict=verdict,
                                               attributes=json.dumps(hash_attr),
                                               mod_attributes=json.dumps({}))
                    wb.clean()
                    wb_list.append(wb)
            if (type_file == 'argus_netflow'):
                pass
                #analysis_session.run_profile()
            #self.run_profile()
            return analysis_session
        except Exception as e:
            print_exception()
            return None
#    @transaction.atomic
#    def run_profile(self):
#        pass
    @transaction.atomic
    def add_weblogs(self,analysis_session_id,key_list, data):
        try:
            temp_key_list = key_list
            print("Weblogs to save: ")
            print(len(data))
            wb_list = []
            with transaction.atomic():
                for elem in data:
                    i = 0
                    hash_attr = {}
                    for k in temp_key_list:
                        hash_attr[k] = elem[i]
                        i += 1
                    wb = Weblog()
                    wb.analysis_session_id = analysis_session_id
                    wb.register_status = RegisterStatus.READY
                    wb.dt_id = hash_attr["dt_id"]
                    wb.verdict = hash_attr["verdict"]
                    hash_attr.pop("db_id", None)
                    hash_attr.pop("register_status", None)
                    hash_attr.pop('verdict', None)
                    hash_attr.pop('dt_id', None)
                    wb.attributes = json.dumps(hash_attr)
                    wb.clean()
                    wb.save()
                    wb_list.append(wb)
            print("Weblogs saved: ")
            print(len(wb_list))
            return wb_list
        except ValidationError as e:
            print_exception()
            return e
        except IntegrityError as e:
            print_exception()
            return e
        except Exception as e:
            print_exception()
            return e

    @transaction.atomic
    def sync_weblogs(self, analysis_session_id,data, user):
        try:
            print("Weblogs to update: ")
            print(len(data))
            data_ids = list(data.keys())
            with transaction.atomic():
                #get all WB changed by models
                analysis_session = AnalysisSession.objects.get(id=analysis_session_id)
                wb_list = analysis_session.weblog_set.filter(register_status=RegisterStatus.MODULE_MODIFICATION)
                wb_exlude_similar = wb_list.exclude(id__in=data_ids)
                list_objs = []
                for wb in wb_exlude_similar:
                    wb.set_register_status(RegisterStatus.READY, save=True)
                    list_objs.append(wb)

                wb_similar = analysis_session.weblog_set.filter(id__in=data_ids)
                for wb in wb_similar:
                    wb.set_verdict(data[str(wb.id)], user, save=True)
                    list_objs.append(wb)

            return list_objs
        except ValidationError as e:
            print_exception()
            return []
        except IntegrityError as e:
            print_exception()
            return []
        except Exception as e:
            print_exception()
            return []


class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    ``created`` and ``modified`` fields.

    """
    created_at = AutoCreatedField(_('created_at'))
    updated_at = AutoLastModifiedField(_('updated_at'))

    class Meta:
        abstract = True


class RegisterStatus(enum.Enum):
    NOT_SAVE = -1
    READY = 0
    CLIENT_MODIFICATION = 1
    MODULE_MODIFICATION = 3
    UPGRADING_LOCK = 2


class AnalysisSession(TimeStampedModel):
    TYPE_FILES = Choices(('bro_http_log','BRO weblogs http.log'),
                         ('cisco_file', 'CISCO weblogs Specific File'),
                         ('argus_netflow','Netflow file from argus capture'))
    INFO_ATTRIBUTES = {TYPE_FILES.cisco_file: {'url':'http.url', 'ip_dist':'endpoints.server'},
                       TYPE_FILES.bro_http_log: {'url': 'host', 'ip_dist': 'id.resp_h'},
                       TYPE_FILES.argus_netflow: {}}

    users = models.ManyToManyField(User, through='AnalysisSessionUsers')
    name = models.CharField(max_length=200, blank=False, null=False, default='Name by Default')
    public = models.BooleanField(default=False)
    type_file = models.CharField(choices=TYPE_FILES, max_length=50, null=False, default=TYPE_FILES.cisco_file)

    objects = AnalysisSessionManager()
    comments = GenericRelation('Comment')

    def __unicode__(self):
        return unicode(self.name)

    def get_columns_order_by(self, user):
        asu = AnalysisSessionUsers.objects.filter(analysis_session_id=self.id, user_id=user.id).first()
        if asu is None:
            return []
        else:
            return json.loads(asu.columns_order)

    def set_columns_order_by(self,user,columns_order):
        asu = AnalysisSessionUsers.objects.filter(analysis_session=self,user_id=user.id).first()
        if asu is None:
            asu = AnalysisSessionUsers.objects.create(analysis_session=self, user_id=user.id)
        asu.columns_order = json.dumps(columns_order)
        asu.save()

    class Meta:
        db_table = 'manati_analysis_sessions'
        permissions = (
            ("read_analysis_session", "Can read an analysis session"),
            ("edit_analysis_session", "Can edit an analysis session"),
            ("create_analysis_session", "Can create an analysis session"),
            ("update_analysis_session", "Can update an analysis session"),
        )
    @transaction.atomic()
    def run_profile(self,ips):
        weblogs = self.weblog_set.all()
        result = dataGather.generate_profile_from_weblogs(weblogs,ips)
        with transaction.atomic():
            for ip in result:
                pr = Profile(ip=ip)
                pr.analysissession = self
                pr.data = result[ip]
                pr.save()



class AnalysisSessionUsers(TimeStampedModel):
    analysis_session = models.ForeignKey(AnalysisSession)
    user = models.ForeignKey(User)
    columns_order = JSONField(default=json.dumps({}), null=True)

    class Meta:
        db_table = 'manati_analysis_sessions_users'

class Weblog(TimeStampedModel):
    id = models.CharField(primary_key=True, null=False, max_length=15)
    analysis_session = models.ForeignKey(AnalysisSession, on_delete=models.CASCADE, null=False)
    attributes = JSONField(default=json.dumps({}), null=False)
    # Verdict Status Attr
    VERDICT_STATUS = Choices(('malicious','Malicious'),
                             ('legitimate','Legitimate'),
                             ('suspicious','Suspicious'),
                             ('undefined', 'Undefined'),
                             ('falsepositive','False Positive'),
                             ('malicious_legitimate', 'Malicious/Legitimate'),
                             ('suspicious_legitimate', 'Suspicious/Legitimate'),
                             ('undefined_legitimate', 'Undefined/Legitimate'),
                             ('falsepositive_legitimate', 'False Positive/Legitimate'),
                             ('undefined_malicious', 'Undefined/Malicious'),
                             ('suspicious_malicious', 'Suspicious/Malicious'),
                             ('falsepositive_malicious', 'False Positive/Malicious'),
                             ('falsepositive_suspicious', 'False Positive/Suspicious'),
                             ('undefined_suspicious', 'Undefined/Suspicious'),
                             ('undefined_falsepositive', 'Undefined/False Positive'),
                             )
    verdict = models.CharField(choices=VERDICT_STATUS, default=VERDICT_STATUS.undefined, max_length=50, null=True)
    register_status = enum.EnumField(RegisterStatus, default=RegisterStatus.READY, null=True)
    mod_attributes = JSONField(default=json.dumps({}), null=True)
    comments = GenericRelation('Comment')
    whois_related_weblogs = models.ManyToManyField("self", related_name='whois_related_weblogs+')
    was_whois_related = models.BooleanField(default=False)
    dt_id = -1

    @property
    def domain(self):
        return get_domain_by_obj(self.attributes_obj)

    @property
    def attributes_obj(self):
        attr = self.attributes
        if attr:
            if type(attr) == dict:
                return attr
            else:
                return json.loads(attr)
        else:
            return json.loads({})

    class Meta:
        db_table = 'manati_weblogs'

    def clean(self, *args, **kwargs):
        self.clean_fields(exclude=['verdict', 'mod_attributes'], *args, **kwargs)
        merge_verdict = self.verdict.split('_')
        if len(merge_verdict) > 1:
            user_verdict = merge_verdict[0]
            model_verdict = merge_verdict[1]
            temp_verdict1 = str(user_verdict) + '_' + str(model_verdict)
            temp_verdict2 = str(model_verdict)+ '_' + str(user_verdict)
            if temp_verdict1 in dict(self.VERDICT_STATUS) is False and temp_verdict2 in dict(self.VERDICT_STATUS) is False :
                raise ValidationError({'verdict': _('Verdict is incorrect, you should use valid verdicts or merging of valid verdicts')})
            else:
                pass
        else:
            if not (self.verdict in dict(self.VERDICT_STATUS)):
                raise ValidationError(
                    {'verdict': _('Verdict is incorrect, you should use valid verdicts or merging of valid verdicts')})

    def weblogs_history(self):
        return WeblogHistory.objects.filter(weblog=self).order_by('-version')

    def set_mod_attributes(self, module_name, new_mod_attributes, save=False):
        new_mod_attributes['created_at'] = str(datetime.datetime.now())
        new_mod_attributes['Module Name'] = module_name
        if str(self.mod_attributes) == '':
            self.mod_attributes = {}
        try:
            self.mod_attributes[module_name] = new_mod_attributes
        except TypeError as e:
            self.mod_attributes = {}
            self.mod_attributes[module_name] = new_mod_attributes
        # self.moduleauxweblog_set.create(status=ModuleAuxWeblog.STATUS.modified)

        if save:
            self.clean()
            self.save()

    @transaction.atomic
    def save_with_history(self, content_object, *args, **kwargs):
        with transaction.atomic():
            old_wbl = Weblog.objects.get(id=self.id)
            old_verdict = kwargs['old_verdict'] if 'old_verdict' in kwargs else old_wbl.verdict
            new_verdict = kwargs['new_verdict'] if 'new_verdict' in kwargs else self.verdict
            if content_object is None:
                content_object = self.analysis_session.users.first()
            weblog_history = self.weblogs_history()
            if not weblog_history or self.verdict != weblog_history[0].verdict:
                newWeblogHistoy = WeblogHistory(weblog=self,
                                                old_verdict=old_verdict,
                                                verdict= new_verdict,
                                                content_object=content_object)
                newWeblogHistoy.save()
            # # save summary history
            kwargs.pop('old_verdict', None)
            kwargs.pop('new_verdict', None)
            self.clean()
            super(Weblog, self).save(*args, **kwargs)

    def set_register_status(self, status, save=False):
        # if RegisterStatus.is_state(status):
        self.register_status = status
        if save:
            self.clean()
            self.save()
        # else:
        #     raise ValidationError("Status Assigned is not correct")

    def set_whois_related_weblogs(self, ids_related):
        for id in ids_related:
            self.whois_related_weblogs.add(Weblog.objects.get(id=id))


    def set_verdict_from_module(self, module_verdict, external_module, save=False):
        old_verdict = self.verdict
        # ADDING LOCK
        #method that modules have to use for changing the verdict
        if module_verdict in dict(self.VERDICT_STATUS):
            if self.verdict != self.VERDICT_STATUS.undefined and self.verdict != module_verdict:
                merge_verdicts = self.verdict.split('_')
                if len(merge_verdicts) > 1:
                    user_verdict = merge_verdicts[0]
                else:
                    user_verdict = self.verdict

                ctype = ContentType.objects.get(model='user')
                last_history = self.histories.filter(content_type=ctype)
                # the some verdict in the history in this weblog was labelled by a user
                if len(last_history) > 0 and not str(user_verdict) == str(module_verdict):
                    temp_verdict = str(user_verdict) + '_' + str(module_verdict)
                else:
                    temp_verdict = str(module_verdict)
                self.verdict = temp_verdict
            else:
                self.verdict = module_verdict
            self.set_register_status(RegisterStatus.MODULE_MODIFICATION)
        else:
            raise ValidationError({'verdict': 'The assigned verdict is invalid ' + module_verdict})

        new_verdict = self.verdict
        self.clean()
        if save:
            self.save_with_history(external_module, old_verdict=old_verdict, new_verdict=new_verdict)

    def set_verdict(self, verdict, user, save=False):
        #ADDING LOCK
        # check if verdict exist
        if verdict in dict(self.VERDICT_STATUS):
            if self.verdict and self.register_status == RegisterStatus.MODULE_MODIFICATION:
                # first is the user says
                temp_verdict = str(verdict) + '_' + str(self.verdict)
                self.verdict = temp_verdict
                # temp_verdict2 = str(verdict) + '_' + str(self.verdict)
                # if temp_verdict1 in dict(self.VERDICT_STATUS):
                #     self.verdict = temp_verdict1
                # elif temp_verdict2 in dict(self.VERDICT_STATUS):
                #     self.verdict = temp_verdict2
                # else:
                #     raise KeyError
                self.set_register_status(RegisterStatus.READY)
            elif self.verdict and self.register_status == RegisterStatus.READY:
                self.verdict = verdict
            elif self.verdict:
                # this check any new state that we didn't consider yet
                raise Exception(
                    "It must not happen, there is register_status not zero (or READY) and should be to be changed")
            elif not self.verdict:
                #SOMETHING IS TOTALLY WRONG
                raise Exception(
                    "It must not happen, verdict is false  and should be to be changed")
        else:
            raise ValidationError

        self.create_aux_seed()
        self.clean()
        if save:
            self.save_with_history(user)

    def create_aux_seed(self):
        self.moduleauxweblog_set.create(status=ModuleAuxWeblog.STATUS.seed)

    def remove_aux_seed(self):
        self.moduleauxweblog_set.filter(status=ModuleAuxWeblog.STATUS.seed).remove()

    def remove_all_aux_weblog(self):
        self.moduleauxweblog_set.clear()

class Profile(TimeStampedModel):
    ip = models.CharField(null=False, max_length=40)
    analysissession = models.ForeignKey(AnalysisSession)
    data = JSONField(default=json.dumps({}), null=False)
    class Meta:
        db_table = 'manati_weblog_profiles'

    @property
    def data_obj(self):
        attr = self.data
        if attr:
            if type(attr) == dict:
                return attr
            else:
                return json.loads(attr)
        else:
            return json.loads({})
class WeblogHistory(TimeStampedModel):
    version = models.IntegerField(editable=False, default=0)
    weblog = models.ForeignKey(Weblog, on_delete=models.CASCADE, null=False, related_name='histories')
    verdict = models.CharField(choices=Weblog.VERDICT_STATUS,
                               default=Weblog.VERDICT_STATUS.undefined, max_length=50, null=False)
    old_verdict = models.CharField(choices=Weblog.VERDICT_STATUS,
                                   default=Weblog.VERDICT_STATUS.undefined, max_length=50, null=False)
    description = models.CharField(max_length=255, null=True, default="")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE) #User or Module
    object_id = models.CharField(max_length=20)
    content_object = GenericForeignKey('content_type', 'object_id')

    def get_author_name(self):
        if type(self.content_object).__name__ == "ExternalModule":
            return self.content_object.module_name
        elif isinstance(self.content_object, User):
            return self.content_object.username

    def created_at_txt(self):
        return self.created_at.isoformat()

    class Meta:
        db_table = 'manati_weblog_history'
        unique_together = ('version', 'weblog')

    def save(self, *args, **kwargs):
        # start with version 1 and increment it for each book
        current_version = WeblogHistory.objects.filter(weblog=self.weblog).order_by('-version')[:1]
        self.version = current_version[0].version + 1 if current_version else 1
        super(WeblogHistory, self).save(*args, **kwargs)


class Comment(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=1)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE) # Weblog or AnalysisSession
    object_id = models.CharField(max_length=20)
    content_object = GenericForeignKey('content_type', 'object_id')
    text = models.CharField(max_length=255)

    class Meta:
        db_table = 'manati_comments'


class MetricManager(models.Manager):

    @transaction.atomic
    def create_bulk_by_user(self, measurements, current_user):
        with transaction.atomic():
            for elem in measurements:
                measure = json.loads(elem)
                event_name = measure['event_name']
                measure.pop('event_name', None)
                Metric.objects.create(event_name=event_name,
                                      params=json.dumps(measure),
                                      content_object=current_user)


class Metric(TimeStampedModel):
    event_name = models.CharField(max_length=200)
    params = JSONField(default='', null=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)  #User or Module
    object_id = models.CharField(max_length=20)
    content_object = GenericForeignKey('content_type', 'object_id')
    objects = MetricManager()

    class Meta:
        db_table = 'manati_metrics'


class VTConsultManager(models.Manager):

    @transaction.atomic
    def create_one_consult(self, query_node,  user, line_report):
        with transaction.atomic():
            info = line_report.split(";")
            index = 0
            info_report_obj = {}
            for elem in info:
                info_report_obj[VTConsult.KEYS_INFO[index]] = elem
                index += 1
            VTConsult.objects.create(query_node=query_node, user=user, info_report=json.dumps(info_report_obj))


class VTConsult(TimeStampedModel):
    KEYS_INFO = ["IP","Rating","Owner","Country Code","Log Line No","Positives","Total","Malicious Samples","Hosts"]
    query_node = models.CharField(max_length=100, null=False)
    info_report = JSONField(default=json.dumps({}), null=False)
    user = models.ForeignKey(User)

    objects = VTConsultManager()

    @staticmethod
    def get_query_info(query_node, user, query_type):
        vt_consul = VTConsult.objects.filter(query_node=query_node,
                                             created_at__gt=timezone.now() - timezone.timedelta(days=15)).first()
        if vt_consul is None:
            if query_type == 'ip':
                management.call_command('virustotal_checker', "--nocsv", "--nocache", ff=query_node, user=user)
                vt_consul = VTConsult.objects.filter(query_node=query_node,
                                                     created_at__gt=timezone.now() - timezone.timedelta(days=15)).first()
            elif query_type == 'domain':
                vt.setkey(AppParameter.objects.get(key=AppParameter.KEY_OPTIONS.virus_total_key_api).value)
                result = vt.getdomain(query_node)
                vt_consul = VTConsult.objects.create(query_node=query_node, user=user, info_report=json.dumps(result))
            else:
                raise ValueError("query_type invalid")
        return vt_consul

    class Meta:
        db_table = 'manati_virustotal_consults'

    def __unicode__(self):
        return unicode(self.info_report) or u''


class AppParameter(TimeStampedModel):
    KEY_OPTIONS = Choices(('virus_total_key_api', 'Virus Total Key API'))
    key = models.CharField(choices=KEY_OPTIONS, default='', max_length=20, null=False)
    value = models.CharField(null=False, default='', max_length=255)

    class Meta:
        db_table = 'manati_app_parameters'


class WhoisConsult(TimeStampedModel):
    query_node = models.CharField(max_length=100, null=False)
    info_report = JSONField(default=json.dumps({}), null=False)
    user = models.ForeignKey(User)



    @staticmethod
    def __get_query_info__(query_node, user, **kwargs ):

        class ComplexEncoder(json.JSONEncoder):
            def default(self, obj):
                if hasattr(obj, 'reprJSON'):
                    return obj.reprJSON()
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat()
                else:
                    return json.JSONEncoder.default(self, obj)

        whois_consult = WhoisConsult.objects.filter(query_node=query_node,
                                                    created_at__gt=timezone.now() - timezone.timedelta(days=365)).first()
        if whois_consult is None:
            if 'ip' in kwargs:
                obj = IPWhois(query_node)
                results = obj.lookup()
                whois_consult = WhoisConsult.objects.create(query_node=query_node,
                                                            info_report=json.dumps(results,
                                                                                   cls=ComplexEncoder),
                                                            user=user)
            elif 'domain' in kwargs:
                w = whois.whois(query_node)
                whois_consult = WhoisConsult.objects.create(query_node=query_node,
                                                            info_report=json.dumps(w,
                                                                                   cls=ComplexEncoder),
                                                            user=user)
            else:
                raise ValueError("you must determine is you want to do a domain or ip consultation by __get_query_info" +
                                 "__('query', SomeUser, domain=True or ip=True")

        return whois_consult

    @staticmethod
    def get_query_info_by_ip(query_node, user):
        return WhoisConsult.__get_query_info__(query_node, user, ip=True)

    @staticmethod
    def get_query_info_by_domain(query_node, user):
        return WhoisConsult.__get_query_info__(query_node, user, domain=True)

    @staticmethod
    def get_query_by_domain(query_node):
        user = User.objects.get(username='anonymous_user_for_metrics')
        return WhoisConsult.get_query_info_by_domain(query_node,user).info_report

    class Meta:
        db_table = 'manati_whois_consults'

    def __unicode__(self):
        return unicode(self.info_report) or u''


class ModuleAuxWeblog(TimeStampedModel):
    weblog = models.ForeignKey(Weblog, on_delete=models.CASCADE)
    STATUS = Choices('seed', 'modified', 'undefined')
    status = models.CharField(choices=STATUS, default=STATUS.undefined, max_length=20, null=False)

    class Meta:
        db_table = 'manati_module_aux_weblogs'


def get_anonymous_user_instance(User):
    return User.objects.get(username='anonymous_user_for_metrics')





